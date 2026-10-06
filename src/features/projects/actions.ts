"use server";

import { revalidatePath } from "next/cache";
import type { ZodError } from "zod";
import { ensureUserProfile } from "@/features/profile/ensure";
import { fetchProfileNames } from "@/features/profile/queries";
import { mapDatabaseError } from "@/lib/supabase/errors";
import { formatRupiah } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  canCancelOrder,
  ORDER_CANCEL_BLOCKED_MESSAGE,
} from "@/features/orders/cancellation";
import type { OrderStatus } from "@/features/orders/types";
import {
  createProjectSchema,
  takeProjectSchema,
  updateProjectStatusSchema,
} from "./schemas";
import { PROJECT_STATUS_MESSAGE } from "./status";
import type {
  CodingProject,
  ProjectActionResult,
  ProjectProgressStatus,
} from "./types";

const PROJECTS_PATH = "/projects";

const SESSION_EXPIRED: ProjectActionResult = {
  status: "error",
  message: "Sesi berakhir. Silakan login kembali.",
};

function toFieldErrors(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }

  return fieldErrors;
}

/** Satu kali pembuatan client + verifikasi sesi, dipakai ulang tiap action. */
async function getSessionContext() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  // Pastikan baris profil publik ada agar FK (`coding_projects_client_id_fkey`
  // / `coding_projects_freelancer_id_fkey`) tidak gagal saat menulis data.
  // Sinkronisasi bersifat best-effort: bila gagal (kolom hilang / RLS), error
  // DB asli tercatat di console server dan operasi tetap lanjut memakai id
  // sesi (`auth.uid()`).
  const profile = await ensureUserProfile(supabase, data.user);
  if (!profile.ok) {
    console.warn(
      "[Profile Sync] Melanjutkan tanpa profil tersinkron:",
      profile.message,
    );
  }

  return { supabase, userId: data.user.id };
}

export async function createProjectAction(
  formData: FormData,
): Promise<ProjectActionResult> {
  const parsed = createProjectSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    budget: formData.get("budget"),
    // Form tidak lagi mengirim selector teknologi; `null` dinormalkan oleh
    // skema menjadi `[]` (array kosong, bukan null — kolom bertipe not null).
    tech_stack: formData.get("tech_stack"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Periksa kembali detail proyek Anda.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const context = await getSessionContext();
  if (!context) {
    return SESSION_EXPIRED;
  }

  const { error } = await context.supabase.from("coding_projects").insert({
    client_id: context.userId,
    title: parsed.data.title,
    description: parsed.data.description,
    // `tech_stack` adalah `text[] not null`; kirim array eksplisit (default `[]`)
    // alih-alih mengandalkan default database agar bebas dari perbedaan skema.
    tech_stack: parsed.data.tech_stack,
    budget: parsed.data.budget,
    status: "pending",
  });

  if (error) {
    console.error("[Projects] INSERT gagal:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      clientId: context.userId,
      title: parsed.data.title,
    });

    return {
      status: "error",
      message: mapDatabaseError(
        error.message,
        "Proyek gagal dipublikasikan. Silakan coba lagi.",
      ),
    };
  }

  revalidatePath(PROJECTS_PATH);
  return {
    status: "success",
    message: `Proyek dipublikasikan! Budget ${formatRupiah(parsed.data.budget)}`,
  };
}

export async function getProjectsAction(): Promise<CodingProject[]> {
  const context = await getSessionContext();
  if (!context) {
    return [];
  }

  const { data, error } = await context.supabase
    .from("coding_projects")
    .select("*")
    .or(
      `client_id.eq.${context.userId},freelancer_id.eq.${context.userId},status.eq.pending`,
    )
    .order("created_at", { ascending: false });

  if (error) {
    return [];
  }

  const projects: CodingProject[] = data ?? [];

  // Resolusi identitas (best-effort) — lihat `fetchProfileNames`.
  const names = await fetchProfileNames(
    context.supabase,
    projects.flatMap((project) => [project.client_id, project.freelancer_id]),
  );

  return projects.map((project) => ({
    ...project,
    tech_stack: project.tech_stack ?? [],
    client_name: names.get(project.client_id) ?? null,
    freelancer_name: project.freelancer_id
      ? (names.get(project.freelancer_id) ?? null)
      : null,
  }));
}

export async function takeProjectAction(
  projectId: string,
): Promise<ProjectActionResult> {
  const parsed = takeProjectSchema.safeParse({ projectId });
  if (!parsed.success) {
    return { status: "error", message: "ID proyek tidak valid." };
  }

  const context = await getSessionContext();
  if (!context) {
    return SESSION_EXPIRED;
  }

  const { error } = await context.supabase
    .from("coding_projects")
    .update({ freelancer_id: context.userId, status: "accepted" })
    .eq("id", parsed.data.projectId)
    .eq("status", "pending");

  if (error) {
    console.error("[Projects] UPDATE (ambil proyek) gagal:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      projectId: parsed.data.projectId,
      freelancerId: context.userId,
    });

    return {
      status: "error",
      message: mapDatabaseError(
        error.message,
        "Gagal mengambil proyek. Silakan coba lagi.",
      ),
    };
  }

  revalidatePath(PROJECTS_PATH);
  return { status: "success", message: PROJECT_STATUS_MESSAGE.accepted };
}

export async function updateProjectStatusAction(
  projectId: string,
  status: ProjectProgressStatus,
): Promise<ProjectActionResult> {
  const parsed = updateProjectStatusSchema.safeParse({ projectId, status });
  if (!parsed.success) {
    return { status: "error", message: "Status proyek tidak valid." };
  }

  const context = await getSessionContext();
  if (!context) {
    return SESSION_EXPIRED;
  }

  // Pembatalan hanya oleh pemilik proyek; status pengerjaan oleh freelancer.
  const ownerColumn =
    parsed.data.status === "cancelled" ? "client_id" : "freelancer_id";

  // Pembatalan hanya sah saat proyek masih `pending` (belum ada freelancer).
  // Status dibaca ulang dari database (tidak pernah dipercaya dari client).
  if (parsed.data.status === "cancelled") {
    const { data: current, error: readError } = await context.supabase
      .from("coding_projects")
      .select("status")
      .eq("id", parsed.data.projectId)
      .maybeSingle();

    if (readError) {
      console.error("[Projects] Gagal membaca status saat pembatalan:", {
        code: readError.code,
        message: readError.message,
        details: readError.details,
        hint: readError.hint,
        projectId: parsed.data.projectId,
      });

      return {
        status: "error",
        message: mapDatabaseError(
          readError.message,
          "Gagal memeriksa status proyek. Silakan coba lagi.",
        ),
      };
    }

    if (!current) {
      return { status: "error", message: "Pesanan tidak ditemukan." };
    }

    if (!canCancelOrder(current.status as OrderStatus)) {
      return { status: "error", message: ORDER_CANCEL_BLOCKED_MESSAGE };
    }
  }

  let query = context.supabase
    .from("coding_projects")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.projectId)
    .eq(ownerColumn, context.userId);

  // Penjaga atomik: mencegah pembatalan bila proyek sudah diambil freelancer
  // di antara pemeriksaan di atas dan UPDATE ini.
  if (parsed.data.status === "cancelled") {
    query = query.eq("status", "pending");
  }

  const { error } = await query;

  if (error) {
    console.error("[Projects] UPDATE status gagal:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      projectId: parsed.data.projectId,
      nextStatus: parsed.data.status,
      ownerColumn,
      userId: context.userId,
    });

    return {
      status: "error",
      message: mapDatabaseError(
        error.message,
        "Gagal memperbarui status proyek. Silakan coba lagi.",
      ),
    };
  }

  revalidatePath(PROJECTS_PATH);
  return {
    status: "success",
    message: PROJECT_STATUS_MESSAGE[parsed.data.status],
  };
}
