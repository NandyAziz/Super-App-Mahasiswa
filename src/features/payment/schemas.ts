import { z } from "zod";
import { ORDER_SERVICES } from "@/features/orders/types";

/** Payload Server Action pengiriman bukti pembayaran (manual QRIS). */
export const submitPaymentProofSchema = z.object({
  orderId: z.string().trim().min(1, "ID pesanan tidak valid"),
  serviceName: z.enum(ORDER_SERVICES),
  proofUrl: z.url("Link bukti pembayaran tidak valid (contoh: https://...)"),
});

export type SubmitPaymentProofInput = z.infer<typeof submitPaymentProofSchema>;

/** Regex email wajib untuk seluruh input email (validasi ketat). */
export const EMAIL_PATTERN =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/** Satu baris item tagihan Snap (`item_details` Midtrans). */
export const snapItemDetailSchema = z.object({
  id: z.string().trim().min(1, "ID item tidak valid").max(64),
  name: z.string().trim().min(1, "Nama item tidak valid").max(256),
  price: z.number().int().positive("Harga item tidak valid"),
  quantity: z.number().int().positive("Jumlah item tidak valid").max(100),
});

/** Info pembeli Snap (`customer_details` Midtrans). */
export const snapCustomerInfoSchema = z.object({
  name: z.string().trim().min(1, "Nama pembeli tidak valid").max(120),
  email: z
    .string()
    .trim()
    .regex(EMAIL_PATTERN, "Format email tidak valid")
    .optional(),
  phone: z.string().trim().max(20, "Nomor telepon terlalu panjang").optional(),
});

/**
 * Payload Server Action `createMidtransSnapToken`. `amount` dan
 * `itemDetails` wajib konsisten — server memvalidasi ulang terhadap nominal
 * asli pesanan di database sebelum membuat token.
 */
export const createSnapTokenSchema = z.object({
  orderId: z.string().trim().min(1, "ID pesanan tidak valid"),
  amount: z
    .number()
    .int("Nominal pembayaran harus bilangan bulat")
    .positive("Nominal pembayaran tidak valid")
    .max(1_000_000_000, "Nominal pembayaran terlalu besar"),
  customerInfo: snapCustomerInfoSchema,
  itemDetails: z
    .array(snapItemDetailSchema)
    .min(1, "Detail item wajib diisi")
    .max(20, "Jumlah item terlalu banyak"),
});

export type CreateSnapTokenInput = z.infer<typeof createSnapTokenSchema>;

/**
 * Notifikasi HTTP (webhook) Midtrans. Field inti (order_id, status_code,
 * gross_amount, signature_key) wajib untuk verifikasi; sisanya opsional
 * dan hanya pelengkap log.
 */
export const midtransNotificationSchema = z.object({
  order_id: z.string().trim().min(1),
  status_code: z.string().trim().min(1),
  gross_amount: z.string().trim().min(1),
  signature_key: z.string().trim().min(1),
  transaction_status: z.string().trim().min(1),
  fraud_status: z.string().trim().min(1).optional(),
  transaction_id: z.string().trim().min(1).optional(),
  payment_type: z.string().trim().min(1).optional(),
});

export type MidtransNotification = z.infer<typeof midtransNotificationSchema>;

/** Validasi bagian `service` dari `order_id` Midtrans (`layanan_<uuid>`). */
export const midtransOrderServiceSchema = z.enum(ORDER_SERVICES);

