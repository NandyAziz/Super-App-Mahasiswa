import { z } from "zod";
import { ORDER_SERVICES } from "@/features/orders/types";

/**
 * Validasi input Server Action pembaruan posisi kurir/operator.
 * Koordinat dibatasi rentang wajib WGS84 sehingga baris buruk tidak pernah
 * masuk ke tabel tracking.
 */
export const upsertOrderTrackingSchema = z.object({
  service: z.enum(ORDER_SERVICES),
  orderId: z.string().trim().min(1, "ID pesanan tidak valid"),
  lat: z.number().min(-90, "Lintang tidak valid").max(90, "Lintang tidak valid"),
  lng: z.number().min(-180, "Bujur tidak valid").max(180, "Bujur tidak valid"),
  note: z.string().trim().max(200).optional(),
});

export type UpsertOrderTrackingInput = z.infer<
  typeof upsertOrderTrackingSchema
>;

/**
 * Pola UUID persis (8-4-4-4-12 heksadesimal). Dipakai setelah ID diekstrak
 * dari input pengguna, sehingga hanya nilai yang benar-benar dapat dikirim ke
 * Postgres (`uuid`) yang lolos.
 */
const PUBLIC_ORDER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** UUID mana pun yang muncul di dalam teks bebas (ID polos maupun URL tautan). */
const UUID_IN_TEXT_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/**
 * Menormalkan input pelacakan menjadi ID pesanan (UUID huruf kecil).
 *
 * Tamu biasanya tidak menyalin UUID mentah, melainkan menempel seluruh tautan
 * pesanan (`https://…/orders/550e8400-…`). Karena itu UUID dicari di dalam teks,
 * bukan diwajibkan berada di awal/akhir.
 *
 * @returns UUID huruf kecil bila ditemukan, atau `null` bila tidak ada.
 */
export function extractOrderId(raw: string): string | null {
  const match = raw.trim().match(UUID_IN_TEXT_PATTERN);
  return match ? match[0].toLowerCase() : null;
}

/**
 * Validasi input form pelacakan publik (`/track`), sekaligus menormalkannya
 * menjadi UUID siap-kirim ke RPC `public.track_order`.
 *
 * Kode ringkas `#PRT-A1B2C3` sengaja TIDAK diterima: hanya 24 bit sehingga
 * mudah ditebak dan dapat dipakai untuk mengintip pesanan orang lain. Lihat
 * migrasi `20261017000000_public_order_tracking.sql`.
 */
export const publicTrackOrderSchema = z.object({
  orderId: z
    .string()
    .trim()
    .min(1, "ID pesanan wajib diisi")
    .refine((value) => extractOrderId(value) !== null, {
      message: "ID pesanan tidak valid. Tempel ID atau tautan pesanan kamu.",
    })
    // Selalu terisi: `refine` di atas sudah menolak nilai tanpa UUID.
    .transform((value) => extractOrderId(value) ?? "")
    .refine((value) => PUBLIC_ORDER_ID_PATTERN.test(value), {
      message: "ID pesanan tidak valid. Tempel ID atau tautan pesanan kamu.",
    }),
});

export type PublicTrackOrderInput = z.infer<typeof publicTrackOrderSchema>;
