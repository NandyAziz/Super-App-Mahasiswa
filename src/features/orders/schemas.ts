import { z } from "zod";

/** Parameter dinamis route `/orders/[orderId]`. */
export const orderDetailParamSchema = z.object({
  orderId: z.string().trim().min(1, "ID pesanan tidak valid"),
});

export type OrderDetailParam = z.infer<typeof orderDetailParamSchema>;
