import type { OrderService, OrderStatus } from "@/features/orders/types";
import { ORDER_RUNNING_STATUSES } from "@/features/orders/types";
import type { AdminOrder } from "./types";
import type { AdminOperatorStatus } from "./status";

export type AdminQueueTab = "active" | "history";

export interface AdminActionDescriptor {
  label: string;
  status: AdminOperatorStatus;
  variant: "primary" | "danger";
}

/**
 * Label aksi khusus layanan cetak. Alur bisnisnya perantara/jastip cetak:
 * tim menerima pesanan & mengambil berkas → dicetak di fotokopi terdekat →
 * diantar ke pemesan. Label generik ("Proses"/"Kirim") tidak menggambarkan
 * pekerjaan lapangan, jadi dipakai override khusus di sini.
 */
const PRINTING_ACTION_LABEL = {
  /** pending/accepted → tim mengambil berkas dari pemesan. */
  receive: "Terima & Ambil Berkas",
  /** in_progress → hasil cetak selesai, siap diantar ke lokasi pemesan. */
  deliver: "Antar ke Pelanggan",
} as const;

/**
 * Menentukan tombol aksi operator berdasarkan status pesanan saat ini.
 * Pesanan yang sudah `completed`, `cancelled`, atau `PAID` bersifat final
 * sehingga tidak menampilkan tombol apa pun.
 *
 * @param status   Status pesanan saat ini.
 * @param service  Layanan pesanan (opsional). Bila `"printing"`, label tombol
 *                 memakai alur perantara cetak; layanan lain (dan pemanggil
 *                 lama yang tidak mengoper argumen ini) tetap memakai label
 *                 generik.
 */
export function resolveAdminActions(
  status: OrderStatus,
  service?: OrderService,
): AdminActionDescriptor[] {
  const isPrinting = service === "printing";

  if (
    status === "pending" ||
    status === "PENDING_VERIFICATION" ||
    status === "accepted" ||
    status === "PAID"
  ) {
    return [
      {
        label: isPrinting ? PRINTING_ACTION_LABEL.receive : "Terima Pesanan",
        status: "in_progress",
        variant: "primary",
      },
      { label: "Batalkan", status: "cancelled", variant: "danger" },
    ];
  }

  if (status === "in_progress") {
    return [
      {
        label: isPrinting ? PRINTING_ACTION_LABEL.deliver : "Kirim",
        status: "out_for_delivery",
        variant: "primary",
      },
      { label: "Tandai Selesai", status: "completed", variant: "primary" },
      { label: "Batalkan", status: "cancelled", variant: "danger" },
    ];
  }

  if (status === "out_for_delivery") {
    return [
      { label: "Tandai Selesai", status: "completed", variant: "primary" },
      { label: "Batalkan", status: "cancelled", variant: "danger" },
    ];
  }

  return [];
}

/** True bila pesanan masih antre aktif (bukan completed/cancelled). */
export function isAdminActiveOrder(status: OrderStatus): boolean {
  return ORDER_RUNNING_STATUSES.includes(status);
}

function matchesQueue(order: AdminOrder, queue: AdminQueueTab): boolean {
  const active = isAdminActiveOrder(order.status);
  return queue === "active" ? active : !active;
}

function matchesQuery(order: AdminOrder, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (normalized === "") {
    return true;
  }
  const haystack = [
    order.customerName,
    order.contactPhone ?? "",
    order.service,
    order.detail,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(normalized);
}

/**
 * Filter antrean admin: tab Aktif (default) vs Riwayat, lalu service, lalu
 * pencarian nama/telepon/layanan. Fungsi murni agar mudah diuji.
 */
export function filterAdminOrders(
  orders: AdminOrder[],
  queue: AdminQueueTab,
  service: string,
  query: string,
): AdminOrder[] {
  return orders.filter(
    (order) =>
      matchesQueue(order, queue) &&
      (service === "all" || order.service === service) &&
      matchesQuery(order, query),
  );
}
