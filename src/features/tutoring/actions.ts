"use server";

import { revalidatePath } from "next/cache";
import type { ZodError } from "zod";
import { ensureUserProfile } from "@/features/profile/ensure";
import { mapDatabaseError } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toScheduledAtIso } from "./schedule";
import {
  TUTORING_FLAT_RATE,
  acceptTutoringSchema,
  createTutoringSchema,
  updateTutoringStatusSchema,
} from "./schemas";
import { TUTORING_STATUS_MESSAGE } from "./status";
import type {
  TutoringActionResult,
  TutoringProgressStatus,
  TutoringSession,
} from "./types";

const TUTORING_PATH = "/tutoring";

const SESSION_EXPIRED: TutoringActionResult = {
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

  // Pastikan baris profil publik ada agar FK (`tutoring_sessions_student_id_fkey`
  // / `tutoring_sessions_tutor_id_fkey`) tidak gagal saat menulis sesi belajar.
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

export async function createTutoringSessionAction(
  formData: FormData,
): Promise<TutoringActionResult> {
  const parsed = createTutoringSchema.safeParse({
    subject: formData.get("subject"),
    scheduled_at: formData.get("scheduled_at"),
    // Tarif flat per sesi; form tidak lagi mengirim harga manual.
    price: formData.get("price") ?? TUTORING_FLAT_RATE,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Periksa kembali detail sesi belajar Anda.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const context = await getSessionContext();
  if (!context) {
    return SESSION_EXPIRED;
  }

  const { error } = await context.supabase.from("tutoring_sessions").insert({
    student_id: context.userId,
    // Sesi selalu terbuka untuk semua tutor (tutor dipilih saat menerima).
    tutor_id: null,
    subject: parsed.data.subject,
    scheduled_at: toScheduledAtIso(parsed.data.scheduled_at),
    price: parsed.data.price,
    status: "pending",
  });

  if (error) {
    return {
      status: "error",
      message: mapDatabaseError(
        error.message,
        "Sesi belajar gagal dibuat. Silakan coba lagi.",
      ),
    };
  }

  revalidatePath(TUTORING_PATH);
  return { status: "success", message: TUTORING_STATUS_MESSAGE.pending };
}

export async function getTutoringSessionsAction(): Promise<TutoringSession[]> {
  const context = await getSessionContext();
  if (!context) {
    return [];
  }

  const { data, error } = await context.supabase
    .from("tutoring_sessions")
    .select("*")
    .or(
      `student_id.eq.${context.userId},tutor_id.eq.${context.userId},status.eq.pending`,
    )
    .order("scheduled_at", { ascending: true });

  if (error) {
    return [];
  }

  const sessions: TutoringSession[] = data ?? [];
  return sessions;
}

export async function acceptTutoringSessionAction(
  sessionId: string,
): Promise<TutoringActionResult> {
  const parsed = acceptTutoringSchema.safeParse({ sessionId });
  if (!parsed.success) {
    return { status: "error", message: "ID sesi tidak valid." };
  }

  const context = await getSessionContext();
  if (!context) {
    return SESSION_EXPIRED;
  }

  const { error } = await context.supabase
    .from("tutoring_sessions")
    .update({ tutor_id: context.userId, status: "accepted" })
    .eq("id", parsed.data.sessionId)
    .eq("status", "pending");

  if (error) {
    return {
      status: "error",
      message: mapDatabaseError(
        error.message,
        "Gagal mengikuti sesi belajar. Silakan coba lagi.",
      ),
    };
  }

  revalidatePath(TUTORING_PATH);
  return { status: "success", message: TUTORING_STATUS_MESSAGE.accepted };
}

export async function updateTutoringStatusAction(
  sessionId: string,
  status: TutoringProgressStatus,
): Promise<TutoringActionResult> {
  const parsed = updateTutoringStatusSchema.safeParse({ sessionId, status });
  if (!parsed.success) {
    return { status: "error", message: "Status sesi tidak valid." };
  }

  const context = await getSessionContext();
  if (!context) {
    return SESSION_EXPIRED;
  }

  // Pembatalan oleh mahasiswa pemesan; progres sesi oleh tutor.
  const ownerColumn =
    parsed.data.status === "cancelled" ? "student_id" : "tutor_id";

  const { error } = await context.supabase
    .from("tutoring_sessions")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.sessionId)
    .eq(ownerColumn, context.userId);

  if (error) {
    return {
      status: "error",
      message: mapDatabaseError(
        error.message,
        "Gagal memperbarui status sesi. Silakan coba lagi.",
      ),
    };
  }

  revalidatePath(TUTORING_PATH);
  return {
    status: "success",
    message: TUTORING_STATUS_MESSAGE[parsed.data.status],
  };
}
