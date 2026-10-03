import { z } from "zod";
import {
  JASTIP_MAX_DISTANCE_KM,
  JASTIP_OUT_OF_RANGE_MESSAGE,
} from "@/lib/pricing";

/**
 * Nomor WhatsApp aktif pemesan (Indonesia). Bersifat WAJIB pada form titipan
 * baru karena dipakai untuk konfirmasi pesanan & koordinasi driver.
 */
export const whatsappSchema = z
  .string()
  .trim()
  .regex(
    /^(\+62|62|0)8[1-9][0-9]{6,11}$/,
    "Nomor WhatsApp tidak valid (contoh: 08123456789)",
  );

/**
 * Input pembuatan titipan. Ongkir dinamis dihitung di Server Action dari
 * `distance_km` (lihat `@/lib/pricing`), lalu disimpan ke kolom `delivery_tip`.
 */
export const createJastipSchema = z.object({
  item_name: z.string().trim().min(3, "Nama barang minimal 3 karakter"),
  whatsapp: whatsappSchema,
  dropoff_location: z
    .string()
    .trim()
    .min(3, "Lokasi antar minimal 3 karakter"),
  distance_km: z.coerce
    .number()
    .positive("Jarak harus lebih dari 0 KM")
    .max(JASTIP_MAX_DISTANCE_KM, JASTIP_OUT_OF_RANGE_MESSAGE),
});

export type CreateJastipInput = z.infer<typeof createJastipSchema>;

export const acceptJastipOrderSchema = z.object({
  orderId: z.string().trim().min(1, "ID pesanan tidak valid"),
});

export const updateJastipStatusSchema = z.object({
  orderId: z.string().trim().min(1, "ID pesanan tidak valid"),
  status: z.enum(["in_progress", "completed"]),
});
