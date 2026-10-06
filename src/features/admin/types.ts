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
 * Satu berkas pelanggan yang dilampirkan pada pesanan (dokumen cetak,
 * brief proyek, bukti pembayaran, dsb). Dirender sebagai file chip
 * interaktif yang membuka/mengunduh langsung dari Supabase Storage.
 */
export interface AdminOrderDocument {
  /** Label siap tampil, mis. nama berkas. */
  label: string;
  /** URL publik berkas. */
  url: string;
  /** Jenis berkas untuk ikon & hint. */
  kind: "document" | "payment-proof" | "attachment";
}

/**
 * Satu baris pesanan yang sudah dinormalisasi lintas 5 layanan untuk tabel
 * operator. Seluruh label sudah diformat di server agar render deterministik.
 */
export interface AdminOrder {
  id: string;
  service: OrderService;
  /** Nama lengkap pemesan dari tabel `public.profiles`. */
  customerName: string;
  /**
   * Nomor WhatsApp/telepon pelanggan bila tersedia di baris layanan
   * (`print_orders.contact_whatsapp`, `WA ...` pada `pickup_location` /
   * `description` / `notes`). `null` bila tidak tercantum.
   */
  contactPhone: string | null;
  /** Alamat / lokasi antar bila ada (jastip & cetak). */
  address: string | null;
  /** Spesifikasi layanan (salinan, deadline, jadwal, instruksi, dsb). */
  specification: string | null;
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
  /**
   * URL dokumen yang perlu dicetak (hanya layanan cetak/akademik).
   * `null` untuk layanan lain atau bila belum diunggah. Dipakai operator
   * untuk membuka/mengunduh berkas di `/admin`.
   */
  documentUrl: string | null;
  /** Seluruh lampiran pelanggan sebagai file chip interaktif. */
  documents: AdminOrderDocument[];
  /**
   * Koordinat lokasi tujuan pelanggan untuk peta navigasi driver; `null` bila
   * pemesan belum mengirim lokasi (kolom NULL di database).
   */
  destinationLat: number | null;
  destinationLng: number | null;
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
