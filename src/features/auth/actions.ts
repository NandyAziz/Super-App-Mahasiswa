"use server";

import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { ZodError } from "zod";
import { ensureUserProfile } from "@/features/profile/ensure";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loginSchema, registerSchema } from "./schemas";
import type { AuthActionResult } from "./types";

type SupabaseServerClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;

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

/** Menampilkan error mentah Supabase Auth di console server untuk keperluan audit. */
function logAuthError(stage: string, error: AuthErrorLike): void {
  console.error("[Auth Error]", stage, {
    message: error.message,
    status: error.status,
    code: error.code,
  });
}

/** Bentuk minimal error Supabase Auth yang dipakai untuk logging & pemetaan. */
interface AuthErrorLike {
  message: string;
  status?: number;
  code?: string;
}

/** Menerjemahkan pesan error Supabase Auth ke bahasa Indonesia yang ramah. */
function mapAuthError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "Email atau password salah.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Email belum diverifikasi. Silakan cek kotak masuk email Anda.";
  }
  if (
    normalized.includes("user already registered") ||
    normalized.includes("already been registered") ||
    normalized.includes("already registered")
  ) {
    return "Email ini sudah terdaftar. Silakan login.";
  }
  if (
    normalized.includes("email rate limit exceeded") ||
    normalized.includes("over_email_send_rate_limit") ||
    normalized.includes("rate limit") ||
    normalized.includes("too many requests") ||
    normalized.includes("for security purposes")
  ) {
    return "Terlalu banyak percobaan pendaftaran. Tunggu beberapa menit lalu coba lagi.";
  }
  if (
    normalized.includes("signups not allowed") ||
    normalized.includes("signup is disabled") ||
    normalized.includes("not allowed for this instance")
  ) {
    return "Pendaftaran akun baru sedang dinonaktifkan. Hubungi admin kampus.";
  }
  if (
    normalized.includes("unable to validate email") ||
    (normalized.includes("email") && normalized.includes("invalid")) ||
    normalized.includes("invalid format")
  ) {
    return "Format email tidak valid. Periksa kembali alamat email Anda.";
  }
  if (
    normalized.includes("password") &&
    (normalized.includes("at least") ||
      normalized.includes("too short") ||
      normalized.includes("weak"))
  ) {
    return "Password terlalu lemah. Gunakan minimal 6 karakter.";
  }
  if (
    normalized.includes("database error saving new user") ||
    normalized.includes("database error")
  ) {
    return "Pendaftaran gagal karena kendala pada database. Coba beberapa saat lagi; bila masih gagal, hubungi admin kampus.";
  }
  if (
    normalized.includes("fetch failed") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("network") ||
    normalized.includes("econnrefused") ||
    normalized.includes("enotfound") ||
    normalized.includes("melebihi batas waktu") ||
    normalized.includes("timeout")
  ) {
    return "Tidak dapat terhubung ke server. Periksa koneksi internet Anda lalu coba lagi.";
  }

  return message;
}

/**
 * Sinkronisasi baris `public.profiles` secara best-effort setelah pendaftaran.
 *
 * Sebagian project Supabase mengandalkan trigger `on_auth_user_created` untuk
 * membuat profil. Bila trigger belum ada / gagal, kita membuatnya sendiri di
 * sini secara idempoten (lihat `ensureUserProfile`) sehingga INSERT ke tabel
 * pesanan tidak lagi gagal karena error foreign key. Kegagalan TIDAK melempar
 * error: pendaftaran tetap dianggap sukses dan error DB asli di-log untuk audit.
 */
async function syncProfileAfterSignup(
  supabase: SupabaseServerClient,
  user: User,
): Promise<void> {
  const profile = await ensureUserProfile(supabase, user);
  if (!profile.ok) {
    console.warn(
      "[Auth] Profil pendaftaran belum tersinkron:",
      profile.message,
    );
  }
}

/** Pesan fallback ramah untuk gangguan jaringan / env yang belum siap. */
function mapUnknownError(error: unknown): string {
  if (error instanceof Error) {
    if (
      error.message.includes("Supabase env tidak ditemukan") ||
      error.message.includes("Konfigurasi Supabase")
    ) {
      return "Layanan login belum dikonfigurasi. Hubungi admin kampus.";
    }

    return mapAuthError(error.message);
  }

  return "Terjadi gangguan koneksi. Silakan coba lagi.";
}

export async function loginAction(
  formData: FormData,
): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Periksa kembali email dan password Anda.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);

    if (error) {
      logAuthError("login.signInWithPassword", error);
      return { status: "error", message: mapAuthError(error.message) };
    }

    return {
      status: "success",
      message: "Login berhasil! Selamat datang kembali 🎉",
      redirectTo: "/",
    };
  } catch (error) {
    return { status: "error", message: mapUnknownError(error) };
  }
}

export async function registerAction(
  formData: FormData,
): Promise<AuthActionResult> {
  const parsed = registerSchema.safeParse({
    full_name: formData.get("full_name"),
    university: formData.get("university"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Periksa kembali data pendaftaran Anda.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const { email, password, full_name, university } = parsed.data;

  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name, university } },
    });

    if (error) {
      logAuthError("register.signUp", error);
      return { status: "error", message: mapAuthError(error.message) };
    }

    // Email confirmation aktif: profil dibuat setelah verifikasi email.
    if (!data.session || !data.user) {
      return {
        status: "success",
        message: "Pendaftaran berhasil! Cek email Anda untuk verifikasi.",
      };
    }

    // Sesi sudah aktif: pastikan baris profil dibuat agar FK pesanan tidak gagal.
    await syncProfileAfterSignup(supabase, data.user);

    return {
      status: "success",
      message: "Akun kampus berhasil dibuat! 🎉",
      redirectTo: "/",
    };
  } catch (error) {
    return { status: "error", message: mapUnknownError(error) };
  }
}

export async function logoutAction(): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // Gangguan jaringan: tetap arahkan ke /login agar tidak crash.
  }

  redirect("/login");
}
