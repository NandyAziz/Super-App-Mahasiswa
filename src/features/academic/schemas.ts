import { z } from "zod";
import {
  ACADEMIC_PROGRESS_STATUSES,
  ACADEMIC_REQUEST_TYPES,
  ACADEMIC_SERVICE_TYPES,
} from "./types";

const urlSchema = z.url();

/**
 * Nomor WhatsApp aktif pemesan (Indonesia). Bersifat WAJIB pada form Bantuan
 * Akademik karena dipakai untuk catatan revisi & update pengerjaan.
 */
export const whatsappSchema = z
  .string()
  .trim()
  .regex(
    /^(\+62|62|0)8[1-9][0-9]{6,11}$/,
    "Nomor WhatsApp tidak valid (contoh: 08123456789)",
  );

/** Link dokumen opsional — harus URL valid bila diisi. */
const documentUrlField = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || urlSchema.safeParse(value).success,
    "Link dokumen tidak valid",
  )
  .transform((value) => (value === "" ? null : value));

/** Catatan opsional — minimal 5 karakter bila diisi. */
const notesField = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || value.length >= 5,
    "Catatan minimal 5 karakter",
  )
  .transform((value) => (value === "" ? null : value));

export const createAcademicServiceSchema = z.object({
  service_type: z.enum(ACADEMIC_SERVICE_TYPES),
  document_url: documentUrlField,
  notes: notesField,
});

export type CreateAcademicServiceInput = z.infer<
  typeof createAcademicServiceSchema
>;

/**
 * Skema validasi form "Bantuan Akademik" (sisi client). Mencakup jenis layanan,
 * SATU lampiran utama (instruksi/rubrik dosen), kontak, dan deadline sebelum
 * dipetakan ke payload Server Action. Draft mahasiswa tidak lagi diminta.
 */
export const academicRequestSchema = z.object({
  service_type: z.enum(ACADEMIC_REQUEST_TYPES),
  rubric_url: z.url(
    "Link instruksi/rubrik dosen tidak valid (contoh: https://...)",
  ),
  whatsapp: whatsappSchema,
  instructions: z.string().trim().min(10, "Instruksi minimal 10 karakter"),
  deadline: z.string().trim().min(1, "Pilih deadline pengajuan"),
});

export type AcademicRequestInput = z.infer<typeof academicRequestSchema>;

export const updateAcademicStatusSchema = z.object({
  serviceId: z.string().trim().min(1, "ID layanan tidak valid"),
  status: z.enum(ACADEMIC_PROGRESS_STATUSES),
});
