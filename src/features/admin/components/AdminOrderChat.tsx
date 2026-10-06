"use client";

import { useState } from "react";
import { MessageSquareText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminOrder } from "../types";
import { ChatSection } from "@/features/chat/components/OrderChat";

interface AdminOrderChatProps {
  order: AdminOrder;
}

/**
 * Chat admin per pesanan — collapsible agar tabel tetap ringkas.
 *
 * Murni presentasional di atas `ChatSection`; kontrak
 * `sendChatMessageAction({ service, orderId, body, attachmentUrl })` tidak
 * berubah. `sender_id` selalu diisi server dari sesi login (`auth.getUser`),
 * sehingga pesan yang dikirim dari panel admin otomatis tercatat sebagai
 * pengirim operator — trigger `handle_chat_message_notification` lalu
 * mengabari pemesan ("Balasan dari Campify").
 */
export function AdminOrderChat({ order }: AdminOrderChatProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-2 rounded-2xl border border-slate-100 bg-slate-50/60">
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-all duration-200 active:scale-[0.98]"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
          <MessageSquareText className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.7rem] font-semibold text-zinc-800">
            Chat pelanggan
          </span>
          <span className="block truncate text-[0.65rem] text-zinc-400">
            {isOpen ? "Sembunyikan percakapan" : "Baca & balas pesan"}
          </span>
        </span>
        <span
          className={cn(
            "shrink-0 text-[0.65rem] font-semibold text-indigo-600 transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        >
          {"▾"}
        </span>
      </button>

      {isOpen ? (
        <div className="px-2 pb-2">
          <ChatSection orderId={order.id} service={order.service} />
        </div>
      ) : null}
    </div>
  );
}
