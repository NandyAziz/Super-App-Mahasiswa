import { z } from "zod";
import { PRINT_DELIVERY_FEE_CAP } from "./delivery";
import { PRINT_PROGRESS_STATUSES } from "./types";

/**
 * Nomor WhatsApp aktif pemesan (Indonesia). Bersifat WAJIB pada form Jasa Cetak
 * karena dipakai untuk konfirmasi pesanan & koordinasi mitra cetak.
 */
export const whatsappSchema = z
  .string()
  .trim()
  .regex(
    /^(\+62|62|0)8[1-9][0-9]{6,11}$/,
    "Nomor WhatsApp tidak valid (contoh: 08123456789)",
  );

import {
  destinationLatSchema,
  destinationLngSchema,
  optionalCoordinateSchema,
} from "@/features/orders/coordinates";

/** Catatan bebas; string kosong dipetakan ke `null` agar bersih di database. */
const customNoteField = z
  .string()
  .trim()
  .max(500, "Catatan maksimal 500 karakter")
  .transform((value) => (value.length > 0 ? value : null));

/**
 * Ongkir pengiriman. Bukan input pengguna: Server Action menghitung ulang
 * nilai ini dari `delivery_location` (lihat `resolvePrintDeliveryEstimate`)
 * sehingga nominal yang dipersist tidak bisa dimanipulasi dari client.
 */
const deliveryFeeField = z.coerce
  .number()
  .int("Ongkir harus berupa bilangan bulat")
  .min(0, "Ongkir tidak boleh negatif")
  .max(PRINT_DELIVERY_FEE_CAP, "Ongkir melebihi batas wajar");

/**
 * Payload Server Action "Jasa Cetak". Hanya memuat input esensial — opsi cetak
 * kompleks (warna, ukuran kertas, sisi, finishing, jumlah halaman) dihapus dan
 * diserahkan ke mitra cetak, sehingga kolom terkait memakai default database.
 *
 * `delivery_fee` diisi dari hasil hitungan server (bukan dari form) dan ikut
 * divalidasi di sini sebelum dipersist.
 */
export const createPrintOrderSchema = z.object({
  document_url: z.url("Link dokumen tidak valid (contoh: https://...)"),
  copies: z.coerce
    .number()
    .int("Jumlah salinan harus bilangan bulat")
    .min(1, "Jumlah salinan minimal 1")
    .max(100, "Jumlah salinan maksimal 100"),
  contact_whatsapp: whatsappSchema,
  delivery_location: z
    .string()
    .trim()
    .min(3, "Lokasi antar minimal 3 karakter"),
  /**
   * Koordinat titik antar (WGS84) — OPSIONAL.
   *
   * Field kosong (pemesan tidak memakai GPS) dinormalisasi menjadi `null`
   * supaya pesanan tetap bisa dibuat tanpa lokasi. Nilai yang terisi wajib
   * berada di rentang geografis yang sah.
   */
  destination_lat: optionalCoordinateSchema(destinationLatSchema, "Latitude"),
  destination_lng: optionalCoordinateSchema(destinationLngSchema, "Longitude"),
  custom_note: customNoteField,
  delivery_fee: deliveryFeeField,
});

export type CreatePrintOrderInput = z.infer<typeof createPrintOrderSchema>;

/**
 * Skema validasi form "Jasa Cetak" (sisi client). Mencakup dokumen, jumlah
 * salinan, kontak, lokasi antar, dan catatan sebelum dipetakan ke payload
 * Server Action yang dipersist ke database.
 */
export const printRequestSchema = z.object({
  document_url: z.url("Link dokumen tidak valid (contoh: https://...)"),
  copies: z.coerce
    .number()
    .int("Jumlah salinan harus bilangan bulat")
    .min(1, "Jumlah salinan minimal 1")
    .max(100, "Jumlah salinan maksimal 100"),
  contact_whatsapp: whatsappSchema,
  delivery_location: z
    .string()
    .trim()
    .min(3, "Lokasi antar minimal 3 karakter"),
  custom_note: z.string().trim().max(500, "Catatan maksimal 500 karakter"),
});

export type PrintRequestInput = z.infer<typeof printRequestSchema>;

export const updatePrintStatusSchema = z.object({
  orderId: z.string().trim().min(1, "ID pesanan tidak valid"),
  status: z.enum(PRINT_PROGRESS_STATUSES),
});
