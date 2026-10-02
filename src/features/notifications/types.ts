import type { OrderService } from "@/features/orders/types";

export type NotificationTone = "info" | "success" | "warning" | "danger";

export interface AppNotification {
  id: string;
  service: OrderService;
  title: string;
  body: string;
  tone: NotificationTone;
  /** Waktu relatif siap tampil, mis. "2 jam lalu". */
  createdLabel: string;
}
