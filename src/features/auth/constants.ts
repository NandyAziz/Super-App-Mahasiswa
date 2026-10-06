/**
 * Konstanta auth yang aman dipakai di server maupun client.
 * Tidak memuat rahasia apa pun sehingga bebas diimpor Client Component.
 */

/** Tautan pemulihan kata sandi Supabase yang menunjuk kembali ke aplikasi. */
export const RESET_PASSWORD_PATH = "/reset-password";

/**
 * Halaman default aplikasi setelah autentikasi berhasil (dashboard / home).
 */
export const DEFAULT_REDIRECT_PATH = "/";

/**
 * Route handler Supabase yang menukar `?code` OAuth (PKCE) menjadi sesi.
 * Dipakai baik oleh `signInWithOAuth` (browser) maupun Route Handler callback.
 */
export const OAUTH_CALLBACK_PATH = "/auth/callback";

/** Daftar provider OAuth yang aktif dipakai tombol social auth. */
export const OAUTH_PROVIDERS = ["google", "github"] as const;

export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];
