import { z } from "zod";
import {
  PROJECT_CATEGORIES,
  PROJECT_DELIVERIES,
  PROJECT_PROGRESS_STATUSES,
} from "./types";

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

/**
 * Mengubah input koma ("React, Node.js, MySQL") menjadi array bersih
 * tanpa item kosong maupun duplikat (case-insensitive).
 */
export function parseTechStack(input: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const rawItem of input.split(",")) {
    const item = rawItem.trim();
    const key = item.toLowerCase();

    if (item.length === 0 || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(item);
  }

  return result;
}

export const createProjectSchema = z.object({
  title: z.string().trim().min(5, "Judul proyek minimal 5 karakter"),
  description: z.string().trim().min(10, "Deskripsi minimal 10 karakter"),
  tech_stack: z.preprocess(
    (value) => (typeof value === "string" ? parseTechStack(value) : value),
    z.array(z.string().trim().min(1)).min(1, "Tambahkan minimal 1 teknologi"),
  ),
  budget: z.coerce
    .number()
    .min(MIN_PROJECT_BUDGET, `Budget minimal ${MIN_BUDGET_LABEL}`),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

/**
 * Skema validasi form "Proyek IT & Tugas" (sisi client). Mencakup seluruh opsi
 * UI (kategori, deadline, lampiran) sebelum dipetakan ke payload Server Action
 * yang dipersist ke database.
 */
export const projectRequestSchema = z.object({
  title: z.string().trim().min(5, "Judul proyek minimal 5 karakter"),
  category: z.enum(PROJECT_CATEGORIES),
  tech_stack: z.preprocess(
    (value) => (typeof value === "string" ? parseTechStack(value) : value),
    z.array(z.string().trim().min(1)).min(1, "Tambahkan minimal 1 teknologi"),
  ),
  whatsapp: whatsappSchema,
  delivery_preference: z.enum(PROJECT_DELIVERIES),
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
