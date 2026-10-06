import type { OrderService } from "@/features/orders/types";

/** Hasil standar Server Action fitur pembayaran manual QRIS. */
export interface PaymentActionResult {
  status: "success" | "error";
  message: string;
}

/**
 * Info pembeli untuk detail invoice Midtrans (`customer_details`).
 * `email`/`phone` opsional — akun telepon Supabase bisa tanpa email.
 */
export interface SnapCustomerInfo {
  name: string;
  email?: string;
  phone?: string;
}

/** Satu baris item tagihan yang diteruskan ke `item_details` Midtrans. */
export interface SnapItemDetail {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

/**
 * Hasil Server Action `createMidtransSnapToken` — union diskriminatif:
 * sukses selalu membawa `token` untuk `window.snap.pay(token)`.
 */
export type SnapTokenActionResult =
  | { status: "success"; token: string; redirectUrl: string }
  | { status: "error"; message: string };

/**
 * Ringkasan pesanan yang bisa dibayar via Snap — `amount` selalu tagihan
 * nyata (> 0). Dipakai `SnapPaymentModal` & `startSnapPayment`.
 */
export interface PayableOrder {
  id: string;
  title: string;
  service: OrderService;
  amount: number;
}

