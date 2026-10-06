export const ORDER_SERVICES = [
  "jastip",
  "printing",
  "projects",
  "tutoring",
  "academic",
] as const;

export type OrderService = (typeof ORDER_SERVICES)[number];

/** Selaras dengan enum Postgres `order_status` di Supabase. */
export const ORDER_STATUSES = [
  "pending",
  /** Bukti transfer diunggah, menunggu verifikasi operator (lihat `features/payment`). */
  "PENDING_VERIFICATION",
  "accepted",
  "in_progress",
  /** Kurir/operator sedang mengantar — memicu peta live tracking. */
  "out_for_delivery",
  "completed",
  "cancelled",
  /** Sudah diverifikasi & lunas (manual QRIS). */
  "PAID",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Status yang dianggap masih berjalan (belum selesai/dibatalkan). */
export const ORDER_RUNNING_STATUSES: readonly OrderStatus[] = [
  "pending",
  "PENDING_VERIFICATION",
  "accepted",
  "in_progress",
  "out_for_delivery",
];

/** Peran user pada sebuah transaksi: pemesan (owner) atau partner (kurir/tutor/freelancer). */
export type OrderRole = "owner" | "partner";

/**
 * Read-model ringkasan lintas layanan untuk halaman Pesanan & Inbox.
 * Seluruh label sudah diformat di server agar render client deterministik.
 */
export interface OrderSummary {
  id: string;
  service: OrderService;
  title: string;
  subtitle: string;
  amountLabel: string | null;
  status: OrderStatus;
  role: OrderRole;
  /** Waktu ISO asli (untuk sorting), tidak ditampilkan langsung. */
  createdAt: string;
  /** Waktu relatif siap tampil, mis. "3 jam lalu". */
  createdLabel: string;
  /**
   * URL dokumen milik pengguna (berkas cetak / dokumen akademik).
   * `null` bila tidak berlaku atau belum diunggah. Dipakai untuk tautan
   * lihat/unduh di `/orders`.
   */
  documentUrl: string | null;
  /** Nominal tagihan dalam Rupiah; `null` bila layanan belum menetapkan tagihan. */
  amount: number | null;
}
