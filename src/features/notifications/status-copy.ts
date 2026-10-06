import type { OrderStatus } from "@/features/orders/types";
import type { NotificationTone } from "./types";

export interface StatusNotificationCopy {
  title: string;
  body: string;
  tone: NotificationTone;
}

/**
 * Copy notifikasi perubahan status dalam Bahasa Indonesia yang simpel.
 *
 * Dipakai di dua tempat yang harus selalu konsisten:
 *   1. Trigger SQL `handle_order_status_notification` (teks yang disimpan).
 *   2. Fallback UI untuk notifikasi lama yang masih memuat string mentah.
 *
 * Jangan menambah status di sini tanpa menambahkan pasangannya di migrasi
 * `20261014000000_notification_status_copy.sql`.
 */
export const STATUS_NOTIFICATION_COPY: Record<OrderStatus, StatusNotificationCopy> =
  {
    pending: {
      title: "Pesanan Diterima",
      body: "Pesananmu sudah masuk dan menunggu diproses Tim Campify.",
      tone: "info",
    },
    PENDING_VERIFICATION: {
      title: "Menunggu Verifikasi",
      body: "Pesananmu sedang diverifikasi pembayaran oleh Tim Campify.",
      tone: "warning",
    },
    accepted: {
      title: "Pesanan Diterima",
      body: "Pesananmu telah diterima Tim Campify.",
      tone: "info",
    },
    in_progress: {
      title: "Pesanan Diproses",
      body: "Pesananmu sedang diproses oleh Tim Campify.",
      tone: "info",
    },
    out_for_delivery: {
      title: "Pesanan Dalam Pengiriman",
      body: "Tim Campify sedang mengantarkan pesanan ke lokasimu.",
      tone: "info",
    },
    completed: {
      title: "Pesanan Selesai",
      body: "Pesananmu sudah selesai diantarkan. Terima kasih!",
      tone: "success",
    },
    cancelled: {
      title: "Pesanan Dibatalkan",
      body: "Pesananmu telah dibatalkan.",
      tone: "danger",
    },
    PAID: {
      title: "Pembayaran Diterima",
      body: "Pembayaranmu sudah diterima. Terima kasih!",
      tone: "success",
    },
  };

/** Copy cadangan bila status di luar daftar (mis. ditambahkan di DB). */
export const DEFAULT_STATUS_COPY: StatusNotificationCopy = {
  title: "Status Pesanan",
  body: "Status pesananmu sudah diperbarui.",
  tone: "info",
};

export function getStatusNotificationCopy(
  status: OrderStatus,
): StatusNotificationCopy {
  return STATUS_NOTIFICATION_COPY[status] ?? DEFAULT_STATUS_COPY;
}

/**
 * Judul generik yang dipakai trigger versi lama, sebelum copy per-status.
 * Notifikasi lama yang masih memakainya perlu ditulis ulang saat ditampilkan.
 */
const LEGACY_STATUS_TITLE = "Status pesanan diperbarui";

/**
 * Body versi lama: `'Pesanan kini berstatus ' || replace(status::text, '_', ' ')`
 * sehingga menghasilkan mis. "Pesanan kini berstatus in progress".
 */
const LEGACY_STATUS_BODY_PATTERN = /^pesanan\s+kini\s+berstatus\s+(.+)$/i;

/**
 * Ubah potongan status mentah dari notifikasi lama menjadi kunci `OrderStatus`.
 *
 * Mengembalikan `null` bila potongan tersebut bukan status yang dikenal, agar
 * teks asli tetap ditampilkan apa adanya alih-alih dipetakan keliru.
 */
export function parseRawOrderStatus(raw: string): OrderStatus | null {
  // "in progress" / "out for delivery" -> "in_progress" / "out_for_delivery"
  const underscored = raw.trim().replace(/\s+/g, "_");

  for (const status of Object.keys(STATUS_NOTIFICATION_COPY) as OrderStatus[]) {
    if (status === underscored) {
      return status;
    }
    // "PENDING VERIFICATION" & "PAID" disimpan trigger lama dengan huruf besar.
    if (status.toLowerCase() === underscored.toLowerCase()) {
      return status;
    }
  }

  return null;
}

export interface NormalizedNotificationCopy {
  title: string;
  body: string;
  tone: NotificationTone;
}

/**
 * Fallback tampilan untuk notifikasi LAMA yang masih memuat judul generik
 * "Status pesanan diperbarui" / body mentah "Pesanan kini berstatus in progress".
 *
 * Notifikasi yang-judulnya sudah ramah (versi baru, atau notifikasi chat)
 * dikembalikan apa adanya. Fungsi ini murni untuk tampilan — data di database
 * tidak diubah.
 */
export function normalizeStoredNotification(
  title: string,
  body: string,
  fallbackTone: NotificationTone = "info",
): NormalizedNotificationCopy {
  const isLegacyTitle = title.trim().toLowerCase() === LEGACY_STATUS_TITLE.toLowerCase();
  const legacyMatch = body.trim().match(LEGACY_STATUS_BODY_PATTERN);
  const status = legacyMatch ? parseRawOrderStatus(legacyMatch[1]) : null;

  if (!status || (!isLegacyTitle && !legacyMatch)) {
    return { title, body, tone: fallbackTone };
  }

  const copy = getStatusNotificationCopy(status);
  return { title: copy.title, body: copy.body, tone: copy.tone };
}