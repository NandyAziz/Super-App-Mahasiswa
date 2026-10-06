import type { PromoCode } from "@/features/promos/catalog";

export const PRINT_PROGRESS_STATUSES = [
  "accepted",
  "in_progress",
  "completed",
  "cancelled",
] as const;

/** Status lanjutan yang boleh di-set mitra fotokopi / admin. */
export type PrintProgressStatus = (typeof PRINT_PROGRESS_STATUSES)[number];

/** Selaras dengan enum Postgres `order_status` di Supabase. */
export const PRINT_STATUSES = ["pending", ...PRINT_PROGRESS_STATUSES] as const;

export type PrintStatus = (typeof PRINT_STATUSES)[number];

/**
 * Merepresentasikan satu baris tabel `public.print_orders` di Supabase.
 * Opsi cetak kompleks (warna, ukuran kertas, sisi, finishing, jumlah halaman)
 * tidak lagi dipilih pemesan — mitra cetak yang menentukannya.
 */
export interface PrintOrder {
  id: string;
  user_id: string;
  document_url: string;
  status: PrintStatus;
  created_at: string;
  /** Kontak WhatsApp pemesan (wajib diisi pada form). */
  contact_whatsapp: string | null;
  /** Lokasi antar/pengambilan hasil cetak. */
  delivery_location: string | null;
  /** Catatan kebutuhan khusus dari pemesan. */
  custom_note: string | null;
  /** Jumlah salinan yang diminta. */
  copies: number;
  /**
   * Ongkir pengiriman hasil cetak, dihitung server dari `delivery_location`
   * (lihat `delivery.ts`). Ikut menentukan total yang dibayar pemesan.
   */
  delivery_fee: number;
  /**
   * Kode promo yang dipakai pesanan ini (jika ada), sudah diverifikasi server.
   * Untuk `PAKET_SKRIPSI` nilainya mencatat klaim, bukan potongan otomatis —
   * biaya cetak dikonfirmasi Tim Campify via WhatsApp.
   */
  promo_code: PromoCode | null;
}

/** Hasil standar yang dikembalikan oleh seluruh Server Action fitur printing. */
export interface PrintActionResult {
  status: "success" | "error";
  message: string;
  fieldErrors?: Record<string, string>;
  /**
   * Terisi saat pembuatan pesanan berhasil — membawa baris yang baru dibuat
   * agar form bisa langsung memicu pembayaran Snap (`startSnapPayment`).
   */
  order?: PrintOrder;
}