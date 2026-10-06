"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, MessagesSquare, Send, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format";
import type { OrderService } from "@/features/orders/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { sendChatMessageAction } from "../actions";
import {
  CHAT_SELECT_COLUMNS,
  type ChatMessage,
  type ChatMessageRow,
} from "../types";
import {
  isAcceptedImage,
  MAX_ATTACHMENT_BYTES,
  uploadChatAttachment,
} from "../upload";

interface OrderChatProps {
  orderId: string;
  service: OrderService;
}

/**
 * Alias tampilan drawer untuk chat pesanan. Murni pembungkus presentasional
 * di atas `OrderChat` — API contract & Server Action tidak berubah.
 */
export function ChatDrawer(props: OrderChatProps) {
  return <OrderChat {...props} />;
}

/**
 * Alias tampilan section untuk chat pesanan. Murni pembungkus presentasional
 * di atas `OrderChat` — API contract & Server Action tidak berubah.
 */
export function ChatSection(props: OrderChatProps) {
  return <OrderChat {...props} />;
}

function toMessage(
  row: ChatMessageRow,
  currentUserId: string,
  currentService: OrderService,
  now: Date,
): ChatMessage {
  return {
    id: row.id,
    orderId: row.order_id,
    service: currentService,
    senderId: row.sender_id,
    body: row.body,
    attachmentUrl: row.attachment_url,
    createdAt: row.created_at,
    createdLabel: formatRelativeTime(row.created_at, now),
    isMine: row.sender_id === currentUserId,
  };
}

/**
 * Chat internal satu pesanan. Riwayat dimuat sekali lalu disinkronkan lewat
 * kanal Realtime Supabase (`postgres_changes` pada `chat_messages`) sehingga
 * pesan admin & pelanggan muncul instan tanpa refresh.
 */
export function OrderChat({ orderId, service }: OrderChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const refreshMessages = useCallback(
    async (uid: string): Promise<void> => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("chat_messages")
        .select(CHAT_SELECT_COLUMNS)
        .eq("order_id", orderId)
        .eq("service", service)
        .order("created_at", { ascending: true });

      if (!error && data) {
        const now = new Date();
        setMessages(
          (data as ChatMessageRow[]).map((row) =>
            toMessage(row, uid, service, now),
          ),
        );
      }
    },
    [orderId, service],
  );

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function bootstrap(): Promise<void> {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id ?? "";
      if (!active) {
        return;
      }

      setCurrentUserId(uid);
      await refreshMessages(uid);
      if (!active) {
        return;
      }
      setIsLoading(false);

      const next = supabase
        .channel(`chat:${service}:${orderId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
            filter: `order_id=eq.${orderId}`,
          },
          (payload: { new: Partial<ChatMessageRow> }) => {
            const row = payload.new;
            if (
              !row?.id ||
              row.order_id !== orderId ||
              row.service !== service
            ) {
              return;
            }

            const complete = row as ChatMessageRow;
            setMessages((prev) =>
              prev.some((item) => item.id === complete.id)
                ? prev
                : [...prev, toMessage(complete, uid, service, new Date())],
            );
          },
        )
        .subscribe();

      channel = next;
      if (!active) {
        void supabase.removeChannel(next);
      }
    }

    void bootstrap();

    return () => {
      active = false;
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [orderId, service, refreshMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }
    if (!isAcceptedImage(file)) {
      toast.error("Hanya gambar (JPG, PNG, WebP, GIF) yang didukung.");
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast.error("Ukuran foto maksimal 5 MB.");
      return;
    }

    setAttachment(file);
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const trimmed = draft.trim();
    if (isSending || (!trimmed && !attachment)) {
      return;
    }

    setIsSending(true);
    try {
      let attachmentUrl: string | undefined;
      if (attachment) {
        attachmentUrl = await uploadChatAttachment(attachment);
      }

      const result = await sendChatMessageAction({
        service,
        orderId,
        body: trimmed.length > 0 ? trimmed : undefined,
        attachmentUrl,
      });

      if (result.status === "error") {
        // Kode asli dari Server Action dicetak agar sisi klien (browser admin)
        // punya jejak yang sama dengan log server.
        console.error("[Admin Chat] kirim pesan gagal:", {
          code: result.code || "GUARD_OR_UNKNOWN",
          message: result.error || result.message || "Gagal mengirim pesan",
          hint:
            result.hint ||
            "Pastikan akun memiliki role admin di tabel profiles",
          rawResult: result,
        });
        toast.error(result.message);
        return;
      }

      setDraft("");
      setAttachment(null);
      // Jaring pengaman bila kanal Realtime belum terhubung.
      await refreshMessages(currentUserId);
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Gagal mengirim pesan.",
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <article className="rounded-3xl border border-white/20 bg-white/70 p-5 shadow-sm backdrop-blur-md">
      <header className="mb-3 flex items-center gap-2.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
          <MessagesSquare className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-zinc-900">Chat Pesanan</h3>
          <p className="text-[0.7rem] text-zinc-500">
            Obrolan internal antara pemesan dan tim Campify.
          </p>
        </div>
      </header>

      <div className="max-h-80 min-h-32 space-y-2.5 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
        {isLoading ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-24 flex-col items-center justify-center gap-1 text-center">
            <MessagesSquare className="h-4 w-4 text-slate-300" />
            <p className="text-[0.7rem] text-slate-400">
              Belum ada pesan. Sapa tim Campify di sini.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.isMine ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3 py-2",
                  message.isMine
                    ? "bg-indigo-500 text-white"
                    : "border border-slate-200 bg-white text-zinc-700",
                )}
              >
                {message.attachmentUrl ? (
                  <a
                    href={message.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={message.attachmentUrl}
                      alt="Lampiran pesan"
                      className="mb-1 max-h-40 rounded-xl object-cover"
                    />
                  </a>
                ) : null}

                {message.body ? (
                  <p className="text-xs break-words whitespace-pre-wrap">
                    {message.body}
                  </p>
                ) : null}

                <p
                  className={cn(
                    "mt-1 text-[0.6rem]",
                    message.isMine ? "text-indigo-100" : "text-zinc-400",
                  )}
                >
                  {message.createdLabel}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {attachment ? (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-2">
          <span className="truncate text-[0.7rem] font-medium text-indigo-600">
            {attachment.name}
          </span>
          <button
            type="button"
            aria-label="Hapus lampiran"
            onClick={() => setAttachment(null)}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-indigo-500 transition-all duration-200 active:scale-95"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-3 flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFileChange}
        />

        <button
          type="button"
          aria-label="Lampirkan foto"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSending}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all duration-200 active:scale-95 disabled:opacity-60"
        >
          <ImagePlus className="h-4 w-4" />
        </button>

        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Tulis pesan…"
          maxLength={2000}
          className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs text-zinc-800 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none"
        />

        <button
          type="submit"
          aria-label="Kirim pesan"
          disabled={isSending || (!draft.trim() && !attachment)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-sm transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </form>
    </article>
  );
}
