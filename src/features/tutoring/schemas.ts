import { z } from "zod";
import { TUTORING_PROGRESS_STATUSES } from "./types";

/** Tarif minimum sesi belajar (Rupiah). */
export const MIN_TUTORING_PRICE = 10000;

/**
 * Tarif flat per sesi belajar. Karena semua permintaan terbuka untuk semua
 * tutor, biaya sesi tidak lagi diisi manual oleh mahasiswa.
 */
export const TUTORING_FLAT_RATE = 35000;

const MIN_PRICE_LABEL = `Rp${MIN_TUTORING_PRICE.toLocaleString("id-ID")}`;

const LOCAL_DATETIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

const scheduledAtField = z
  .string()
  .trim()
  .regex(LOCAL_DATETIME_REGEX, "Format tanggal & waktu tidak valid")
  .refine(
    (value) => !Number.isNaN(new Date(`${value}Z`).getTime()),
    "Tanggal & waktu tidak valid",
  );

/**
 * Input pembuatan sesi belajar. `tutor_id` sengaja TIDAK disertakan: sesi selalu
 * terbuka untuk semua tutor sehingga Server Action menulis `tutor_id: null`.
 * `price` memakai tarif flat sebagai nilai default.
 */
export const createTutoringSchema = z.object({
  subject: z.string().trim().min(3, "Mata kuliah minimal 3 karakter"),
  scheduled_at: scheduledAtField,
  price: z.coerce
    .number()
    .min(MIN_TUTORING_PRICE, `Tarif minimal ${MIN_PRICE_LABEL}`)
    .default(TUTORING_FLAT_RATE),
});

export type CreateTutoringInput = z.infer<typeof createTutoringSchema>;

export const acceptTutoringSchema = z.object({
  sessionId: z.string().trim().min(1, "ID sesi tidak valid"),
});

export const updateTutoringStatusSchema = z.object({
  sessionId: z.string().trim().min(1, "ID sesi tidak valid"),
  status: z.enum(TUTORING_PROGRESS_STATUSES),
});
