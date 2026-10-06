export const TUTORING_PROGRESS_STATUSES = [
  "in_progress",
  "completed",
  "cancelled",
] as const;

/** Status lanjutan sesi belajar (di-set tutor/pemesan sesuai peran). */
export type TutoringProgressStatus = (typeof TUTORING_PROGRESS_STATUSES)[number];

/** Selaras dengan enum Postgres `order_status` di Supabase. */
export const TUTORING_STATUSES = [
  "pending",
  "accepted",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export type TutoringStatus = (typeof TUTORING_STATUSES)[number];

/** Mode pelaksanaan sesi belajar. */
export const TUTORING_MODES = ["online", "offline"] as const;
export type TutoringMode = (typeof TUTORING_MODES)[number];

export function isTutoringMode(value: string): value is TutoringMode {
  return (TUTORING_MODES as readonly string[]).includes(value);
}

/** Merepresentasikan satu baris tabel `public.tutoring_sessions`. */
export interface TutoringSession {
  id: string;
  student_id: string;
  tutor_id: string | null;
  subject: string;
  scheduled_at: string;
  price: number;
  status: TutoringStatus;
  created_at: string;
  /**
   * Nama lengkap pemesan (student) & tutor dari `public.profiles`.
   * Di-resolve terpisah oleh `getTutoringSessionsAction` karena FK tabel ini
   * menunjuk `auth.users`, bukan `profiles`, sehingga tidak bisa di-embed.
   * `null` bila profil belum ada atau lookup gagal (UI menampilkan fallback).
   */
  student_name?: string | null;
  tutor_name?: string | null;
}

export interface TutoringActionResult {
  status: "success" | "error";
  message: string;
  fieldErrors?: Record<string, string>;
  /**
   * Terisi saat pembuatan sesi berhasil — baris baru agar form bisa langsung
   * memicu pembayaran Snap (`startSnapPayment`).
   */
  order?: TutoringSession;
}
