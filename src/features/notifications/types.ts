import type { OrderService } from "@/features/orders/types";

export type NotificationTone = "info" | "success" | "warning" | "danger";

export interface AppNotification {
  id: string;
  /** `null` bila notifikasi tidak terkait layanan tertentu. */
  service: OrderService | null;
  title: string;
  body: string;
  tone: NotificationTone;
  /** Waktu relatif siap tampil, mis. "2 jam lalu". */
  createdLabel: string;
}
