"use server";

import { revalidatePath } from "next/cache";
import type { ZodError } from "zod";
import { ensureUserProfile } from "@/features/profile/ensure";
import { mapDatabaseError } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  canCancelOrder,
  ORDER_CANCEL_BLOCKED_MESSAGE,
} from "@/features/orders/cancellation";
import type { OrderStatus } from "@/features/orders/types";
import {
  createAcademicServiceSchema,
  updateAcademicStatusSchema,
} from "./schemas";
import { ACADEMIC_STATUS_MESSAGE } from "./status";
import type {
  AcademicActionResult,
  AcademicProgressStatus,
  AcademicService,
} from "./types";

const ACADEMIC_PATH = "/academic";

const SESSION_EXPIRED: AcademicActionResult = {
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

  // Pastikan baris profil publik ada agar FK (`academic_services_user_id_fkey`)
  // tidak gagal saat membuat pengajuan layanan. Sinkronisasi bersifat
  // best-effort: bila gagal (kolom hilang / RLS), error DB asli tercatat di
  // console server dan operasi tetap lanjut memakai id sesi (`auth.uid()`).
  const profile = await ensureUserProfile(supabase, data.user);
  if (!profile.ok) {
    console.warn(
      "[Profile Sync] Melanjutkan tanpa profil tersinkron:",
      profile.message,
    );
  }

  return { supabase, userId: data.user.id };
}

export async function createAcademicServiceAction(
  formData: FormData,
): Promise<AcademicActionResult> {
  const parsed = createAcademicServiceSchema.safeParse({
    service_type: formData.get("service_type"),
    document_url: formData.get("document_url") ?? "",
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Periksa kembali pengajuan bantuan akademik Anda.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const context = await getSessionContext();
  if (!context) {
    return SESSION_EXPIRED;
  }

  const { error } = await context.supabase.from("academic_services").insert({
    user_id: context.userId,
    service_type: parsed.data.service_type,
    document_url: parsed.data.document_url,
    notes: parsed.data.notes,
    status: "pending",
  });

  if (error) {
    console.error("[Academic] INSERT gagal:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      userId: context.userId,
      serviceType: parsed.data.service_type,
    });

    return {
      status: "error",
      message: mapDatabaseError(
        error.message,
        "Pengajuan bantuan gagal dibuat. Silakan coba lagi.",
      ),
    };
  }

  revalidatePath(ACADEMIC_PATH);
  return { status: "success", message: ACADEMIC_STATUS_MESSAGE.pending };
}

export async function getAcademicServicesAction(): Promise<AcademicService[]> {
  const context = await getSessionContext();
  if (!context) {
    return [];
  }

  const { data, error } = await context.supabase
    .from("academic_services")
    .select("*")
    .eq("user_id", context.userId)
    .order("created_at", { ascending: false });

  if (error) {
    return [];
  }

  const services: AcademicService[] = data ?? [];
  return services;
}

export async function updateAcademicStatusAction(
  serviceId: string,
  status: AcademicProgressStatus,
): Promise<AcademicActionResult> {
  const parsed = updateAcademicStatusSchema.safeParse({ serviceId, status });
  if (!parsed.success) {
    return { status: "error", message: "Status layanan tidak valid." };
  }

  const context = await getSessionContext();
  if (!context) {
    return SESSION_EXPIRED;
  }

  // Pembatalan hanya sah saat pesanan masih `pending`. Status dibaca ulang dari
  // database (tidak pernah dipercaya dari client).
  if (parsed.data.status === "cancelled") {
    const { data: current, error: readError } = await context.supabase
      .from("academic_services")
      .select("status")
      .eq("id", parsed.data.serviceId)
      .maybeSingle();

    if (readError) {
      console.error("[Academic] Gagal membaca status saat pembatalan:", {
        code: readError.code,
        message: readError.message,
        details: readError.details,
        hint: readError.hint,
        serviceId: parsed.data.serviceId,
      });

      return {
        status: "error",
        message: mapDatabaseError(
          readError.message,
          "Gagal memeriksa status pengajuan. Silakan coba lagi.",
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
    .from("academic_services")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.serviceId)
    .eq("user_id", context.userId);

  // Penjaga atomik: mencegah pembatalan bila status berubah menjadi bukan
  // `pending` di antara pemeriksaan di atas dan UPDATE ini.
  if (parsed.data.status === "cancelled") {
    query = query.eq("status", "pending");
  }

  const { error } = await query;

  if (error) {
    console.error("[Academic] UPDATE status gagal:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      serviceId: parsed.data.serviceId,
      nextStatus: parsed.data.status,
      userId: context.userId,
    });

    return {
      status: "error",
      message: mapDatabaseError(
        error.message,
        "Gagal memperbarui status layanan. Silakan coba lagi.",
      ),
    };
  }

  revalidatePath(ACADEMIC_PATH);
  return {
    status: "success",
    message: ACADEMIC_STATUS_MESSAGE[parsed.data.status],
  };
}
