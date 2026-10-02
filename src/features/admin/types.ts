import type { OrderService, OrderStatus } from "@/features/orders/types";

/**
 * Filter layanan pada Pusat Pengelolaan Pesanan admin. `all` menampilkan
 * gabungan kelima layanan Campify.
 */
export const ADMIN_SERVICE_FILTERS = [
  "all",
  "jastip",
  "printing",
  "projects",
  "tutoring",
  "academic",
] as const;

export type AdminServiceFilter = (typeof ADMIN_SERVICE_FILTERS)[number];

/**
 * Satu baris pesanan yang sudah dinormalisasi lintas 5 layanan untuk tabel
 * operator. Seluruh label sudah diformat di server agar render deterministik.
 */
export interface AdminOrder {
  id: string;
  service: OrderService;
  /** Nama lengkap pemesan dari tabel `public.profiles`. */
  customerName: string;
  /** Ringkasan detail layanan (item, dokumen, judul, dsb). */
  detail: string;
  /** Nominal tagihan dalam Rupiah; `null` bila layanan belum menetapkan tagihan. */
  amount: number | null;
  /** Nominal siap tampil, mis. "Tip Rp10.000". */
  amountLabel: string | null;
  status: OrderStatus;
  /** Waktu ISO asli (untuk sorting). */
  createdAt: string;
  /** Waktu relatif siap tampil, mis. "3 jam lalu". */
  createdLabel: string;
  /** URL bukti pembayaran (manual QRIS); `null` bila belum diunggah. */
  paymentProofUrl: string | null;
}

/** Ringkasan operator lintas layanan untuk kartu overview. */
export interface AdminOverview {
  totalOrders: number;
  /** Pesanan berstatus `pending` / `accepted` yang menunggu tindakan operator. */
  needsAction: number;
  /** Total pendapatan terkumpul (QRIS / pesanan berjalan & selesai). */
  revenue: number;
  revenueLabel: string;
}

/** Payload lengkap halaman `/admin` (daftar pesanan + kartu overview). */
export interface AdminOrdersPayload {
  orders: AdminOrder[];
  overview: AdminOverview;
}

/** Hasil standar yang dikembalikan Server Action fitur admin. */
export interface AdminActionResult {
  status: "success" | "error";
  message: string;
}
