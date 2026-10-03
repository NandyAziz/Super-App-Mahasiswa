import { z } from "zod";
import { PROJECT_PROGRESS_STATUSES } from "./types";

/** Budget minimum proyek (Rupiah). */
export const MIN_PROJECT_BUDGET = 10000;

const MIN_BUDGET_LABEL = `Rp${MIN_PROJECT_BUDGET.toLocaleString("id-ID")}`;

/**
 * Nomor WhatsApp aktif pemesan (Indonesia). Bersifat WAJIB pada form Proyek IT
 * karena dipakai untuk koordinasi teknis & konfirmasi pengerjaan.
 */
export const whatsappSchema = z
  .string()
  .trim()
  .regex(
    /^(\+62|62|0)8[1-9][0-9]{6,11}$/,
    "Nomor WhatsApp tidak valid (contoh: 08123456789)",
  );

export const createProjectSchema = z.object({
  title: z.string().trim().min(5, "Judul proyek minimal 5 karakter"),
  // Deskripsi dibangun dari instruksi + metadata (deadline, kontak, lampiran)
  // di sisi client, lihat `buildProjectDescription`.
  description: z.string().trim().min(10, "Deskripsi minimal 10 karakter"),
  budget: z.coerce
    .number()
    .min(MIN_PROJECT_BUDGET, `Budget minimal ${MIN_BUDGET_LABEL}`),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

/**
 * Skema validasi form "Proyek IT & Tugas" (sisi client). Mencakup input esensial
 * (judul, instruksi, deadline, lampiran, kontak) sebelum dipetakan ke payload
 * Server Action yang dipersist ke database.
 */
export const projectRequestSchema = z.object({
  title: z.string().trim().min(5, "Judul proyek minimal 5 karakter"),
  whatsapp: whatsappSchema,
  instructions: z.string().trim().min(10, "Instruksi minimal 10 karakter"),
  deadline: z.string().trim().min(1, "Pilih deadline proyek"),
  attachment_url: z.union([z.url("Link lampiran tidak valid"), z.literal("")]),
  budget: z.coerce
    .number()
    .min(MIN_PROJECT_BUDGET, `Budget minimal ${MIN_BUDGET_LABEL}`),
});

export type ProjectRequestInput = z.infer<typeof projectRequestSchema>;

export const takeProjectSchema = z.object({
  projectId: z.string().trim().min(1, "ID proyek tidak valid"),
});

export const updateProjectStatusSchema = z.object({
  projectId: z.string().trim().min(1, "ID proyek tidak valid"),
  status: z.enum(PROJECT_PROGRESS_STATUSES),
});
