import {
  ORDER_RUNNING_STATUSES,
  type OrderService,
  type OrderSummary,
} from "@/features/orders/types";
import type { AppNotification, NotificationTone } from "./types";

const SERVICE_NOUN: Record<string, string> = {
  jastip: "Pesanan Jastip",
  printing: "Pesanan cetak",
  projects: "Proyek IT",
  tutoring: "Sesi tutor",
  academic: "Pengajuan akademik",
};

interface StatusCopy {
  verb: string;
  tone: NotificationTone;
}

const STATUS_COPY: Record<string, StatusCopy> = {
  pending: { verb: "menunggu diproses", tone: "warning" },
  PENDING_VERIFICATION: {
    verb: "menunggu verifikasi pembayaran",
    tone: "warning",
  },
  accepted: { verb: "diterima", tone: "info" },
  in_progress: { verb: "sedang berjalan", tone: "info" },
  completed: { verb: "selesai", tone: "success" },
  cancelled: { verb: "dibatalkan", tone: "danger" },
  PAID: { verb: "sudah dibayar", tone: "success" },
};

function describe(order: OrderSummary): {
  title: string;
  tone: NotificationTone;
} {
  const noun = SERVICE_NOUN[order.service] ?? "Pesanan";
  const copy = STATUS_COPY[order.status] ?? STATUS_COPY.pending;

  return { title: `${noun} ${copy.verb}`, tone: copy.tone };
}

/**
 * Menurunkan notifikasi dari aktivitas transaksi user. Karena belum ada tabel
 * `notifications`, feed dibangun (derived) dari read-model pesanan terbaru.
 */
export function buildNotifications(
  orders: OrderSummary[],
): AppNotification[] {
  return orders.map((order) => {
    const { title, tone } = describe(order);

    return {
      id: `${order.service}-${order.id}`,
      service: order.service,
      title,
      body: order.title,
      tone,
      createdLabel: order.createdLabel,
    };
  });
}

export function countRunningNotifications(orders: OrderSummary[]): number {
  return orders.filter((order) => ORDER_RUNNING_STATUSES.includes(order.status))
    .length;
}

export function getServiceNoun(service: OrderService): string {
  return SERVICE_NOUN[service] ?? "Pesanan";
}
