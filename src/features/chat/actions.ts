"use server";

import type { OrderService } from "@/features/orders/types";
import { fetchProfileRole } from "@/features/profile/queries";
import { mapDatabaseError } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  sendChatMessageSchema,
  type ChatActionResult,
  type SendChatMessageInput,
} from "./schemas";

type SupabaseServerClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;

const TABLE_BY_SERVICE: Record<OrderService, string> = {
  jastip: "jastip_orders",
  printing: "print_orders",
  projects: "coding_projects",
  tutoring: "tutoring_sessions",
  academic: "academic_services",
};

/** Kolom kepemilikan & partner tiap tabel layanan. */
const PARTICIPANT_COLUMNS: Record<OrderService, readonly string[]> = {
  jastip: ["user_id", "courier_id"],
  printing: ["user_id"],
  projects: ["client_id", "freelancer_id"],
  tutoring: ["student_id", "tutor_id"],
  academic: ["user_id"],
};

const SESSION_EXPIRED: ChatActionResult = {
  status: "error",
  message: "Sesi berakhir. Silakan login kembali.",
};

const FORBIDDEN: ChatActionResult = {
  status: "error",
  message: "Anda tidak berhak mengobrol pada pesanan ini.",
};

/**
 * Cek apakah user adalah pemesan/partner pesanan. RLS tetap menjadi penjaga
 * akhir di database; pemeriksaan ini hanya untuk pesan error yang jelas.
 */
async function isThreadParticipant(
  supabase: SupabaseServerClient,
  service: OrderService,
  orderId: string,
  userId: string,
): Promise<{ ok: boolean; result?: ChatActionResult }> {
  const columns = PARTICIPANT_COLUMNS[service];
  const { data, error } = await supabase
    .from(TABLE_BY_SERVICE[service])
    .select(columns.join(","))
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      result: {
        status: "error",
        message: mapDatabaseError(
          error.message,
          "Gagal memeriksa pesanan. Silakan coba lagi.",
        ),
      },
    };
  }

  if (!data) {
    return { ok: false, result: { status: "error", message: "Pesanan tidak ditemukan." } };
  }

  const row = data as Record<string, string | null>;
  const isParticipant = columns.some((column) => row[column] === userId);

  return isParticipant ? { ok: true } : { ok: false, result: FORBIDDEN };
}

/**
 * Petunjuk diagnosis untuk kegagalan INSERT `chat_messages`, berdasarkan kode
 * error asli PostgREST. Tanpa ini, 42501 (RLS) dan 23503 (FK) sama-sama
 * tampil sebagai "gagal mengirim" sehingga penyebabnya tidak terbaca.
 */
function explainChatFailure(
  code: string | undefined,
  details: string | null,
): string | undefined {
  const normalizedDetails = (details ?? "").toLowerCase();

  if (code === "42501" || normalizedDetails.includes("row-level security")) {
    return (
      "Operator ditolak RLS: pastikan baris public.profiles untuk akun ini ada " +
      "dan role = 'admin' (jalankan migrasi 20261009000000_chat_profiles_backfill.sql)."
    );
  }

  if (code === "23503" || normalizedDetails.includes("foreign key")) {
    return (
      "Pengirim tidak ada di auth.users — akun hasil signup manual/import " +
      "perlu baris public.profiles + sesi login ulang."
    );
  }

  if (code === "23514" || normalizedDetails.includes("check constraint")) {
    return "Pesan kosong atau nilai service tidak dikenal — cek kolom constraint chat_messages.";
  }

  if (
    code === "PGRST205" ||
    code === "42P01" ||
    normalizedDetails.includes("schema cache")
  ) {
    return "Tabel chat_messages belum ada di database — jalankan migrasi 20261004000000.";
  }

  return undefined;
}

/**
 * Mengirim satu pesan chat internal untuk sebuah pesanan.
 *
 * `sender_id` SELALU diisi server dari sesi login (`auth.getUser`) — klien
 * tidak pernah memasok sender/role. Bila pemanggil adalah operator
 * (`role === "admin"`), pesan otomatis tercatat sebagai pengirim admin
 * sehingga trigger `handle_chat_message_notification` mengabari pemesan
 * ("Balasan dari Campify"); bila pemanggil pelanggan, wajib peserta thread
 * dan trigger mengabari seluruh operator.
 *
 * Notifikasi lawan bicara dibuat oleh trigger database
 * (`handle_chat_message_notification`) sehingga tidak dapat dipalsukan klien.
 */
export async function sendChatMessageAction(
  input: SendChatMessageInput,
): Promise<ChatActionResult> {
  const parsed = sendChatMessageSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Pesan tidak valid.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return SESSION_EXPIRED;
  }

  const userId = data.user.id;
  const role = await fetchProfileRole(userId);

  // Admin (operator) bebas masuk seluruh thread; selain itu wajib peserta.
  if (role !== "admin") {
    const access = await isThreadParticipant(
      supabase,
      parsed.data.service,
      parsed.data.orderId,
      userId,
    );
    if (!access.ok) {
      // Guard ini menolak SEBELUM INSERT, jadi error aslinya tidak pernah sampai
      // ke database. Gejala paling umum: baris `public.profiles` untuk akun ini
      // hilang sehingga `fetchProfileRole` -&gt; "user" (fail-safe) dan
      // `public.is_admin()` juga false di sisi RLS.
      console.error("[Admin Chat] INSERT gagal:", {
        code: "GUARD_PARTICIPANT",
        message: access.result?.message ?? "Akses ditolak sebelum INSERT.",
        details: `role=${role}; sender bukan peserta thread`,
        hint:
          "Bila pengirim adalah operator: pastikan baris public.profiles untuk " +
          "akun ini ada dan role = 'admin' (jalankan migrasi " +
          "20261009000000_chat_profiles_backfill.sql).",
        service: parsed.data.service,
        orderId: parsed.data.orderId,
        senderId: userId,
        senderRole: role,
      });

      return {
        ...(access.result ?? FORBIDDEN),
        code: "GUARD_PARTICIPANT",
        error: access.result?.message ?? "Akses ditolak sebelum INSERT.",
      };
    }
  }

  const { error: insertError } = await supabase.from("chat_messages").insert({
    order_id: parsed.data.orderId,
    service: parsed.data.service,
    sender_id: userId,
    body: parsed.data.body && parsed.data.body.length > 0 ? parsed.data.body : null,
    attachment_url: parsed.data.attachmentUrl ?? null,
  });

  if (insertError) {
    // Cetak detail error ASLI Supabase ke log server (bukan ke respons), agar
    // tabel/kolom/RLS/FK yang gagal dapat ditelusuri tanpa menebak.
    console.error("[Admin Chat] INSERT gagal:", {
      code: insertError.code,
      message: insertError.message,
      details: insertError.details,
      hint: insertError.hint,
      service: parsed.data.service,
      orderId: parsed.data.orderId,
      senderId: userId,
      senderRole: role,
    });

    return {
      status: "error",
      message: mapDatabaseError(
        insertError.message,
        "Gagal mengirim pesan. Silakan coba lagi.",
      ),
      code: insertError.code,
      hint: explainChatFailure(insertError.code, insertError.details),
      error: insertError.message,
    };
  }

  return { status: "success", message: "Pesan terkirim." };
}
