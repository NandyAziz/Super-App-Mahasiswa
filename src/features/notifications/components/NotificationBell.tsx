"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const BELL_CLASS =
  "relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-xs transition-all duration-200 hover:text-indigo-600 active:scale-95";

interface NotificationBellProps {
  /** Jumlah belum dibaca saat render server. */
  initialCount: number;
}

/**
 * Lonceng notifikasi dengan badge unread count.
 *
 * Berlangganan `postgres_changes` pada tabel `notifications` (difilter ke
 * `user_id` user login) sehingga badge bertambah langsung saat pesanan berubah
 * status atau pesan chat baru masuk — tanpa refresh halaman.
 */
export function NotificationBell({ initialCount }: NotificationBellProps) {
  /*
   * Sinkronisasi derived state saat render (pola resmi React
   * "adjusting state during render") — bukan di dalam effect — sehingga
   * badge kembali akurat setiap navigasi yang me-render ulang header,
   * namun tetap bisa bertambah via Realtime di antara navigasi.
   */
  const [count, setCount] = useState(initialCount);
  const [previousInitial, setPreviousInitial] = useState(initialCount);
  if (previousInitial !== initialCount) {
    setPreviousInitial(initialCount);
    setCount(initialCount);
  }

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function subscribe(): Promise<void> {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!active || !userId) {
        return;
      }

      const next = supabase
        .channel(`notifications-bell:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            if (active) {
              setCount((previous) => previous + 1);
            }
          },
        )
        .subscribe();

      channel = next;
      if (!active) {
        void supabase.removeChannel(next);
      }
    }

    void subscribe();

    return () => {
      active = false;
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, []);

  const label =
    count > 0 ? `Notifikasi (${count} belum dibaca)` : "Notifikasi";

  return (
    <Link href="/inbox" aria-label={label} className={BELL_CLASS}>
      <Bell className="h-4.5 w-4.5" />

      {count > 0 ? (
        <span
          aria-hidden="true"
          className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[0.55rem] leading-none font-bold text-white ring-2 ring-white"
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
