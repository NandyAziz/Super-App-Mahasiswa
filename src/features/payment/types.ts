/** Hasil standar Server Action fitur pembayaran manual QRIS. */
export interface PaymentActionResult {
  status: "success" | "error";
  message: string;
}
