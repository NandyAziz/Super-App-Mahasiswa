"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { ZodError } from "zod";
import { ensureUserProfile } from "@/features/profile/ensure";
import { resolveRequestOrigin } from "@/lib/app-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  OAUTH_CALLBACK_PATH,
  RESET_PASSWORD_PATH,
} from "./constants";
import {
  forgotPasswordSchema,
  loginSchema,
  parseLoginIdentifier,
  registerSchema,
  resetPasswordSchema,
} from "./schemas";
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

/**
 * Masuk dengan email ATAU nomor HP, satu kolom identitas + kata sandi.
 *
 * Identitas tunggal dipecah menjadi kredensial Supabase yang tepat
 * (`signInWithPassword({ email })` atau `{ phone }`). Nomor HP memerlukan
 * provider Phone aktif di dashboard Supabase.
 *
 * `remember` (checkbox "Keep me signed in") menentukan apakah cookie sesi
 * ditulis sebagai cookie persisten atau session cookie — lihat
 * `createSupabaseServerClient({ persistSession })`.
 */
export async function loginAction(
  formData: FormData,
): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
    remember: formData.get("remember") === "on",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Periksa kembali email/nomor HP dan kata sandi Anda.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const identifier = parseLoginIdentifier(parsed.data.identifier);
  if (!identifier) {
    // Tidak dapat terjadi: `loginSchema` sudah menolak identitas tak dikenal.
    return {
      status: "error",
      message: "Masukkan email atau nomor HP yang valid.",
    };
  }

  const credentials =
    identifier.kind === "email"
      ? { email: identifier.email, password: parsed.data.password }
      : { phone: identifier.phone, password: parsed.data.password };

  try {
    const supabase = await createSupabaseServerClient({
      persistSession: parsed.data.remember,
    });
    const { data, error } =
      await supabase.auth.signInWithPassword(credentials);

    if (error) {
      logAuthError("login.signInWithPassword", error);
      return { status: "error", message: mapAuthError(error.message) };
    }

    // Best-effort: pastikan baris profil ada agar FK tabel pesanan aman.
    if (data.user) {
      await ensureUserProfile(supabase, data.user);
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

/**
 * Origin aplikasi dari header request saat ini (untuk Server Action yang perlu
 * membangun URL absolut, mis. `redirectTo` email pemulihan kata sandi).
 */
async function resolveActionOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost";
  const request = new Request(`http://${host}`, {
    headers: new Headers(headerList),
  });

  return resolveRequestOrigin(request);
}

/**
 * Mengirim tautan atur ulang kata sandi ke email pengguna.
 *
 * `redirectTo` diarahkan ke callback milik aplikasi agar `?code` PKCE ditukar
 * menjadi sesi, lalu pengguna mendarat di `/reset-password`.
 *
 * Untuk email yang BELUM terdaftar, Supabase tetap membalas sukses (perilaku
 * bawaannya) sehingga halaman ini tidak dapat dipakai menebak email mana yang
 * punya akun — pesan sukses karena itu sengaja berbunyi "bila email tersebut
 * terdaftar".
 */
export async function requestPasswordResetAction(
  formData: FormData,
): Promise<AuthActionResult> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Periksa kembali email Anda.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const origin = await resolveActionOrigin();
    const { error } = await supabase.auth.resetPasswordForEmail(
      parsed.data.email,
      {
        redirectTo: `${origin}${OAUTH_CALLBACK_PATH}?next=${RESET_PASSWORD_PATH}`,
      },
    );

    if (error) {
      logAuthError("reset.resetPasswordForEmail", error);
      return { status: "error", message: mapAuthError(error.message) };
    }

    return {
      status: "success",
      message:
        "Bila email tersebut terdaftar, tautan atur ulang kata sandi sudah dikirim. Cek kotak masuk emailmu.",
    };
  } catch (error) {
    return { status: "error", message: mapUnknownError(error) };
  }
}

/**
 * Menetapkan kata sandi baru setelah tautan pemulihan membuka sesi.
 *
 * Wajib memiliki sesi aktif sehingga tidak dapat dipakai tanpa bukti
 * kepemilikan email.
 */
export async function updatePasswordAction(
  formData: FormData,
): Promise<AuthActionResult> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Periksa kembali kata sandi Anda.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return {
        status: "error",
        message:
          "Sesi pemulihan tidak ditemukan. Buka kembali tautan dari email Anda.",
      };
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });

    if (updateError) {
      logAuthError("reset.updateUser", updateError);
      return { status: "error", message: mapAuthError(updateError.message) };
    }

    return {
      status: "success",
      message: "Kata sandi berhasil diperbarui. Selamat datang kembali! 🎉",
      redirectTo: "/",
    };
  } catch (error) {
    return { status: "error", message: mapUnknownError(error) };
  }
}

/**
 * Membuat akun baru dengan email ATAU nomor HP + kata sandi.
 *
 * `full_name`/`university` tidak lagi dikirim sebagai metadata karena form
 * tidak memintanya: trigger database `handle_new_user` mengisi default
 * 'Mahasiswa'/'Kampus' sehingga baris `public.profiles` tetap terbuat.
 *
 * Nomor HP memerlukan provider Phone aktif di dashboard Supabase.
 */
export async function registerAction(
  formData: FormData,
): Promise<AuthActionResult> {
  const parsed = registerSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Periksa kembali data pendaftaran Anda.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const identifier = parseLoginIdentifier(parsed.data.identifier);
  if (!identifier) {
    // Tidak dapat terjadi: `registerSchema` sudah menolak identitas tak dikenal.
    return {
      status: "error",
      message: "Masukkan email atau nomor HP yang valid.",
    };
  }

  const credentials =
    identifier.kind === "email"
      ? { email: identifier.email, password: parsed.data.password }
      : { phone: identifier.phone, password: parsed.data.password };

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp(credentials);

    if (error) {
      logAuthError("register.signUp", error);
      return { status: "error", message: mapAuthError(error.message) };
    }

    // Konfirmasi email/SMS masih aktif: belum ada sesi sampai diverifikasi.
    if (!data.session || !data.user) {
      return {
        status: "success",
        message:
          identifier.kind === "phone"
            ? "Pendaftaran berhasil! Cek SMS untuk kode verifikasi."
            : "Pendaftaran berhasil! Cek email Anda untuk verifikasi.",
      };
    }

    // Sesi sudah aktif: pastikan baris profil ada agar FK pesanan tidak gagal.
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
