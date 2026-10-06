import type { OrderService } from "@/features/orders/types";

/** Satu pesan chat internal pada sebuah pesanan. */
export interface ChatMessage {
  id: string;
  orderId: string;
  service: OrderService;
  senderId: string;
  body: string | null;
  /** URL publik lampiran foto di bucket `chat-attachments`. */
  attachmentUrl: string | null;
  /** Waktu ISO asli. */
  createdAt: string;
  /** Waktu relatif siap tampil, mis. "2 menit lalu". */
  createdLabel: string;
  /** True bila pesan ditulis oleh user yang sedang login. */
  isMine: boolean;
}

/** Baris mentah `public.chat_messages`. */
export interface ChatMessageRow {
  id: string;
  order_id: string;
  service: string;
  sender_id: string;
  body: string | null;
  attachment_url: string | null;
  created_at: string;
}

export const CHAT_SELECT_COLUMNS =
  "id, order_id, service, sender_id, body, attachment_url, created_at";

export const CHAT_REALTIME_FILTER_PREFIX = "order_id=eq.";
