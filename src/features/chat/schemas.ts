import { z } from "zod";
import { ORDER_SERVICES } from "@/features/orders/types";

/**
 * Validasi input Server Action pengiriman pesan chat.
 * Pesan wajib berisi teks dan/atau lampiran foto — tidak pernah keduanya kosong.
 */
export const sendChatMessageSchema = z
  .object({
    service: z.enum(ORDER_SERVICES),
    orderId: z.string().trim().min(1, "ID pesanan tidak valid"),
    body: z.string().trim().max(2_000, "Pesan terlalu panjang").optional(),
    attachmentUrl: z
      .string()
      .trim()
      .max(2_048, "URL lampiran terlalu panjang")
      .optional(),
  })
  .refine(
    (value) =>
      (value.body !== undefined && value.body.length > 0) ||
      (value.attachmentUrl !== undefined && value.attachmentUrl.length > 0),
    { message: "Pesan tidak boleh kosong" },
  );

export type SendChatMessageInput = z.infer<typeof sendChatMessageSchema>;

export interface ChatActionResult {
  status: "success" | "error";
  message: string;
  /**
   * Kode error asli PostgREST (mis. `42501` RLS, `23503` foreign key) agar UI
   * dapat mendiagnosis kegagalan tanpa menampilkan pesan mentah ke pengguna.
   */
  code?: string;
  /** Petunjuk penyebab yang sudah diterjemahkan (hanya untuk `status: "error"`). */
  hint?: string;
  /**
   * Pesan error mentah dari server/Postgres. HANYA untuk log diagnostik —
   * jangan pernah dirender ke pengguna; `message` yang aman ditampilkan.
   */
  error?: string;
}
