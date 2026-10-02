import type { JastipOrder, JastipProgressStatus } from "./types";

/** Titipan yang dibuat oleh user (mode pemesan). */
export function selectMyOrders(
  orders: JastipOrder[],
  userId: string,
): JastipOrder[] {
  return orders.filter((order) => order.user_id === userId);
}

/** Orderan yang relevan untuk kurir: pending milik orang lain + yang sedang diantar. */
export function selectCourierOrders(
  orders: JastipOrder[],
  userId: string,
): JastipOrder[] {
  return orders.filter(
    (order) =>
      (order.status === "pending" && order.user_id !== userId) ||
      (order.courier_id === userId && order.status !== "completed"),
  );
}

export interface JastipCardAction {
  kind: "accept" | "advance";
  label: string;
  nextStatus?: JastipProgressStatus;
}

/** Menentukan tombol aksi yang tampil pada kartu berdasarkan status & peran user. */
export function resolveCardAction(
  order: JastipOrder,
  userId: string,
): JastipCardAction | null {
  const isCourier = order.courier_id === userId;

  if (order.status === "pending" && order.user_id !== userId) {
    return { kind: "accept", label: "Ambil Pesanan" };
  }
  if (order.status === "accepted" && isCourier) {
    return { kind: "advance", label: "Mulai Antar", nextStatus: "in_progress" };
  }
  if (order.status === "in_progress" && isCourier) {
    return { kind: "advance", label: "Selesaikan", nextStatus: "completed" };
  }

  return null;
}
