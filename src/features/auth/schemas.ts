import { z } from "zod";

/**
 * Validasi email kampus sesuai aturan Campify (`.clinerules`): hanya domain
 * akademik berakhiran `.ac.id` atau `.edu` yang diterima. Dipusatkan di sini
 * agar dipakai konsisten oleh login, register, dan validasi real-time.
 */
export const CAMPUS_EMAIL_REGEX =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(ac\.id|edu)$/;

const CAMPUS_EMAIL_MESSAGE =
  "Gunakan email kampus (berakhiran .ac.id atau .edu)";

const emailField = z
  .string()
  .trim()
  .min(1, "Email wajib diisi")
  .regex(CAMPUS_EMAIL_REGEX, CAMPUS_EMAIL_MESSAGE);

const passwordField = z.string().min(6, "Password minimal 6 karakter");

export const loginSchema = z.object({
  email: emailField,
  password: passwordField,
});

export const registerSchema = z.object({
  full_name: z.string().trim().min(3, "Nama lengkap minimal 3 karakter"),
  university: z.string().trim().min(3, "Nama universitas minimal 3 karakter"),
  email: emailField,
  password: passwordField,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

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
    : (result.error.issues[0]?.message ?? CAMPUS_EMAIL_MESSAGE);
}
