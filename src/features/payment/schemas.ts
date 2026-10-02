import { z } from "zod";
import { ORDER_SERVICES } from "@/features/orders/types";

/** Payload Server Action pengiriman bukti pembayaran (manual QRIS). */
export const submitPaymentProofSchema = z.object({
  orderId: z.string().trim().min(1, "ID pesanan tidak valid"),
  serviceName: z.enum(ORDER_SERVICES),
  proofUrl: z.url("Link bukti pembayaran tidak valid (contoh: https://...)"),
});

export type SubmitPaymentProofInput = z.infer<typeof submitPaymentProofSchema>;
