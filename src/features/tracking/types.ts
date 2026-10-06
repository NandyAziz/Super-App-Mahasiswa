import type { OrderService, OrderStatus } from "@/features/orders/types";

/** Satu posisi terakhir pesanan (baris `public.order_trackings`). */
export interface OrderTracking {
  orderId: string;
  service: OrderService;
  lat: number;
  lng: number;
  note: string | null;
  /** Waktu ISO pembaruan posisi terakhir. */
  updatedAt: string;
}

/** Query filter realtime: hanya satu filter yang didukung protokol Realtime. */
export function trackingRealtimeFilter(orderId: string): string {
  return `order_id=eq.${orderId}`;
}

/**
 * Status publik satu pesanan untuk halaman `/track` (dibaca TANPA sesi).
 *
 * Sengaja hanya memuat kolom aman-publik: identitas pemesan, kurir, tujuan
 * antar, nomor WhatsApp, berkas privat, nominal tagihan, dan koordinat kurir
 * TIDAK pernah dikirim ke klien. Sumbernya RPC `public.track_order`
 * (lihat migrasi `20261017000000_public_order_tracking.sql`).
 */
export interface PublicOrderTracking {
  service: OrderService;
  status: OrderStatus;
  /** Judul ringkas non-sensitif (barang/judul proyek/mapel); `null` bila tidak ada. */
  reference: string | null;
  /** Waktu ISO pesanan dibuat. */
  createdAt: string;
  /** Waktu ISO posisi kurir terakhir diperbarui; `null` bila belum ada. */
  locationUpdatedAt: string | null;
}
