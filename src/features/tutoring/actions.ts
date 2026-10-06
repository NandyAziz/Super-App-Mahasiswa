"use server";

import { revalidatePath } from "next/cache";
import type { ZodError } from "zod";
import { ensureUserProfile } from "@/features/profile/ensure";
import { fetchProfileNames } from "@/features/profile/queries";
import { mapDatabaseError } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  canCancelOrder,
  ORDER_CANCEL_BLOCKED_MESSAGE,
} from "@/features/orders/cancellation";
import type { OrderStatus } from "@/features/orders/types";
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

  const { data, error } = await context.supabase
    .from("tutoring_sessions")
    .insert({
      student_id: context.userId,
      // Sesi selalu terbuka untuk semua tutor (tutor dipilih saat menerima).
      tutor_id: null,
      subject: parsed.data.subject,
      scheduled_at: toScheduledAtIso(parsed.data.scheduled_at),
      price: parsed.data.price,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) {
    console.error("[Tutoring] INSERT gagal:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      studentId: context.userId,
      subject: parsed.data.subject,
    });

    return {
      status: "error",
      message: mapDatabaseError(
        error.message,
        "Sesi belajar gagal dibuat. Silakan coba lagi.",
      ),
    };
  }

  revalidatePath(TUTORING_PATH);
  return {
    status: "success",
    message: TUTORING_STATUS_MESSAGE.pending,
    // Baris baru dipakai form untuk langsung memicu pembayaran Snap.
    order: data as TutoringSession,
  };
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

  // Resolusi identitas (best-effort): FK menunjuk `auth.users` sehingga tidak
  // bisa di-embed — lihat `fetchProfileNames`. Gagal → nama null (fallback UI).
  const names = await fetchProfileNames(
    context.supabase,
    sessions.flatMap((session) => [session.student_id, session.tutor_id]),
  );

  return sessions.map((session) => ({
    ...session,
    student_name: names.get(session.student_id) ?? null,
    tutor_name: session.tutor_id
      ? (names.get(session.tutor_id) ?? null)
      : null,
  }));
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
    console.error("[Tutoring] UPDATE (terima sesi) gagal:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      sessionId: parsed.data.sessionId,
      tutorId: context.userId,
    });

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

  // Pembatalan hanya sah saat sesi masih `pending` (belum ada tutor).
  // Status dibaca ulang dari database (tidak pernah dipercaya dari client).
  if (parsed.data.status === "cancelled") {
    const { data: current, error: readError } = await context.supabase
      .from("tutoring_sessions")
      .select("status")
      .eq("id", parsed.data.sessionId)
      .maybeSingle();

    if (readError) {
      console.error("[Tutoring] Gagal membaca status saat pembatalan:", {
        code: readError.code,
        message: readError.message,
        details: readError.details,
        hint: readError.hint,
        sessionId: parsed.data.sessionId,
      });

      return {
        status: "error",
        message: mapDatabaseError(
          readError.message,
          "Gagal memeriksa status sesi. Silakan coba lagi.",
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
    .from("tutoring_sessions")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.sessionId)
    .eq(ownerColumn, context.userId);

  // Penjaga atomik: mencegah pembatalan bila ada tutor yang sudah menerima
  // sesi di antara pemeriksaan di atas dan UPDATE ini.
  if (parsed.data.status === "cancelled") {
    query = query.eq("status", "pending");
  }

  const { error } = await query;

  if (error) {
    console.error("[Tutoring] UPDATE status gagal:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      sessionId: parsed.data.sessionId,
      nextStatus: parsed.data.status,
      ownerColumn,
      userId: context.userId,
    });

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
