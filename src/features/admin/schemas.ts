import { z } from "zod";
import { ORDER_SERVICES } from "@/features/orders/types";
import { ADMIN_OPERATOR_STATUSES } from "./status";

/** Validasi input Server Action pembaruan status oleh operator Campify. */
export const updateAdminOrderStatusSchema = z.object({
  service: z.enum(ORDER_SERVICES),
  orderId: z.string().trim().min(1, "ID pesanan tidak valid"),
  status: z.enum(ADMIN_OPERATOR_STATUSES),
});

export type UpdateAdminOrderStatusInput = z.infer<
  typeof updateAdminOrderStatusSchema
>;

/** Validasi input Server Action konfirmasi pembayaran manual QRIS. */
export const confirmOrderPaymentSchema = z.object({
  service: z.enum(ORDER_SERVICES),
  orderId: z.string().trim().min(1, "ID pesanan tidak valid"),
});

export type ConfirmOrderPaymentInput = z.infer<
  typeof confirmOrderPaymentSchema
>;
