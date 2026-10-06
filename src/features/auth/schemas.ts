import { z } from "zod";

/**
 * Validasi email standar: menerima alamat email apa pun (Gmail, Yahoo,
 * Outlook, domain kampus, dll.) selama formatnya valid. Dipusatkan di sini
 * agar dipakai konsisten oleh login, register, lupa kata sandi, dan validasi
 * real-time.
 */
export const EMAIL_REGEX =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const EMAIL_MESSAGE = "Masukkan email yang valid";

const emailField = z
  .string()
  .trim()
  .min(1, "Email wajib diisi")
  .regex(EMAIL_REGEX, EMAIL_MESSAGE);

const passwordField = z.string().min(6, "Password minimal 6 karakter");

/**
 * Menormalkan nomor HP Indonesia menjadi format E.164 (`+62…`).
 *
 * Menerima variasi umum: `0812-3456-7890`, `08123456789`, `628123456789`,
 * `+62 812 3456 789`. Format lain (termasuk nomor luar negeri) ditolak agar
 * tidak ada nomor ambigu yang dikirim ke Supabase Phone auth.
 *
 * @returns Nomor `+62…` bila valid, atau `null` bila tidak dikenali.
 */
export function normalizeIndonesianPhone(raw: string): string | null {
  const compact = raw.replace(/[\s().-]/g, "");

  if (!/^\+?\d+$/.test(compact)) {
    return null;
  }

  let digits = compact.replace(/^\+/, "");

  if (digits.startsWith("0")) {
    digits = `62${digits.slice(1)}`;
  } else if (!digits.startsWith("62")) {
    return null;
  }

  // `62` + nomor nasional 9–13 digit → total 11–15 digit (batas E.164).
  if (digits.length < 11 || digits.length > 15) {
    return null;
  }

  return `+${digits}`;
}

/**
 * Identitas masuk yang sudah dipastikan bentuknya: email atau nomor HP.
 * Dipakai `loginAction` untuk memilih kredensial yang tepat bagi Supabase.
 */
export type LoginIdentifier =
  | { kind: "email"; email: string }
  | { kind: "phone"; phone: string };

/**
 * Menafsirkan input bebas pengguna menjadi email atau nomor HP.
 *
 * Email didahulukan dan divalidasi memakai `EMAIL_REGEX` (email standar,
 * tanpa pembatasan domain kampus).
 *
 * @returns Identitas ternormalisasi, atau `null` bila bukan keduanya.
 */
export function parseLoginIdentifier(raw: string): LoginIdentifier | null {
  const value = raw.trim();

  if (EMAIL_REGEX.test(value)) {
    return { kind: "email", email: value.toLowerCase() };
  }

  const phone = normalizeIndonesianPhone(value);
  return phone ? { kind: "phone", phone } : null;
}

const IDENTIFIER_MESSAGE = "Masukkan email atau nomor HP yang valid";

/**
 * Kolom identitas untuk masuk & daftar: satu isian yang menerima email ATAU
 * nomor HP. Dipakai bersama oleh `loginSchema` dan `registerSchema` supaya
 * aturan validasinya tidak pernah berbeda antar layar.
 */
const identifierField = z
  .string()
  .trim()
  .min(1, "Email atau nomor HP wajib diisi")
  .refine((value) => parseLoginIdentifier(value) !== null, {
    message: IDENTIFIER_MESSAGE,
  });

const PASSWORD_CONFIRM_MESSAGE = "Konfirmasi kata sandi tidak cocok";

/** Pemeriksaan bersama: `password` dan `confirm` harus identik. */
function passwordsMatch(value: { password: string; confirm: string }): boolean {
  return value.password === value.confirm;
}

/**
 * Kredensial masuk: satu kolom identitas (email ATAU nomor HP) + kata sandi,
 * ditambah preferensi "Tetap masuk".
 *
 * `identifier` divalidasi sebagai "salah satu dari keduanya" lewat `refine`,
 * lalu `parseLoginIdentifier` dipanggil sekali lagi di Server Action untuk
 * mendapatkan bentuk yang sudah pasti (union bertipe).
 */
export const loginSchema = z.object({
  identifier: identifierField,
  password: passwordField,
  remember: z.boolean(),
});

/**
 * Pendaftaran akun baru dengan email ATAU nomor HP + kata sandi (diulang).
 *
 * `full_name` & `university` sengaja tidak lagi diminta di form: trigger
 * database `handle_new_user` sudah mengisinya dengan default
 * ('Mahasiswa'/'Kampus') sehingga baris `public.profiles` tetap terbuat tanpa
 * kolom NOT NULL yang kosong.
 */
export const registerSchema = z
  .object({
    identifier: identifierField,
    password: passwordField,
    confirm: z.string(),
  })
  .refine(passwordsMatch, {
    message: PASSWORD_CONFIRM_MESSAGE,
    path: ["confirm"],
  });

/** Permintaan tautan atur ulang kata sandi (dikirim Supabase ke email pengguna). */
export const forgotPasswordSchema = z.object({
  email: emailField,
});

/** Penetapan kata sandi baru setelah tautan pemulihan membuka sesi. */
export const resetPasswordSchema = z
  .object({
    password: passwordField,
    confirm: z.string(),
  })
  .refine(passwordsMatch, {
    message: PASSWORD_CONFIRM_MESSAGE,
    path: ["confirm"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/**
 * Validasi email real-time untuk Client Component.
 * Mengembalikan pesan error, atau `null` bila valid / masih kosong.
 */
export function validateEmail(value: string): string | null {
  if (value.trim().length === 0) {
    return null;
  }

  const result = emailField.safeParse(value);
  return result.success
    ? null
    : (result.error.issues[0]?.message ?? EMAIL_MESSAGE);
}
