"use server";

import { revalidatePath } from "next/cache";
import type { ZodError } from "zod";
import { ensureUserProfile } from "@/features/profile/ensure";
import { mapDatabaseError } from "@/lib/supabase/errors";
import { formatRupiah } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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
    // `tech_stack` memakai default database ('{}') karena selector teknologi
    // sudah dihapus dari form pengajuan proyek.
    budget: parsed.data.budget,
    status: "pending",
  });

  if (error) {
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
  return projects;
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

  const { error } = await context.supabase
    .from("coding_projects")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.projectId)
    .eq(ownerColumn, context.userId);

  if (error) {
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
