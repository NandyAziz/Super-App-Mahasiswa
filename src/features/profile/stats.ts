import { ORDER_RUNNING_STATUSES } from "@/features/orders/types";
import type { OrderSummary } from "@/features/orders/types";
import type { ProfileStats } from "./types";

export function computeProfileStats(orders: OrderSummary[]): ProfileStats {
  const completedOrders = orders.filter(
    (order) => order.status === "completed",
  ).length;
  const activeOrders = orders.filter((order) =>
    ORDER_RUNNING_STATUSES.includes(order.status),
  ).length;

  return {
    totalOrders: orders.length,
    activeOrders,
    completedOrders,
  };
}
