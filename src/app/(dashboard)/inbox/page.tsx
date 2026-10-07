import { Suspense } from "react";
import type { Metadata } from "next";
import { BellOff, Inbox as InboxIcon, Loader2 } from "lucide-react";
import { fetchOrderSummaries } from "@/features/orders/queries";
import { buildNotifications } from "@/features/notifications/build";
import { fetchStoredNotifications } from "@/features/notifications/queries";
import { InboxSkeleton } from "@/features/notifications/components/InboxSkeleton";
import { ClearAllInboxButton } from "@/features/notifications/components/ClearAllInboxButton";
import { MarkAllNotificationsRead } from "@/features/notifications/components/MarkAllNotificationsRead";
import { NotificationItem } from "@/features/notifications/components/NotificationItem";

export const metadata: Metadata = {
  title: "Notifikasi · Campify",
};

/**
 * Header halaman — murni presentasional, tanpa logika data.
 */
function InboxHeader({ total }: { total: number }) {
  return (
    <header className="rounded-3xl border border-white/20 bg-white/70 p-5 shadow-sm backdrop-blur-md">
      <div className="flex items-center justify-between w-full gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm shadow-indigo-500/30">
          <InboxIcon className="h-5 w-5" />
        </span>
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold text-zinc-900">
              Notifikasi &amp; Pesan
            </h1>
            <p className="truncate text-xs text-zinc-500">
              {total > 0
                ? `${total} kabar terbaru dari pesananmu.`
                : "Pantau kabar terbaru dari semua pesananmu."}
            </p>
          </div>

          {/* Aksi "Hapus Semua" — satu tombol untuk satu tampilan gabungan. */}
          <div className="flex shrink-0 items-center gap-2">
            <ClearAllInboxButton />
          </div>
        </div>
      </div>
    </header>
  );
}

function EmptyInbox() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-zinc-200 bg-white/60 px-6 py-12 text-center backdrop-blur-md">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
        <BellOff className="h-6 w-6" />
      </span>
      <p className="text-sm font-semibold text-zinc-700">
        Belum ada notifikasi
      </p>
      <p className="text-xs text-zinc-500">
        Aktivitas pesananmu di 5 layanan Campify akan muncul di sini.
      </p>
    </div>
  );
}

/**
 * Keadaan memuat daftar — dipakai sebagai fallback Suspense.
 * Murni visual; tidak mengubah sumber data.
 */
function NotificationListSkeleton() {
  return (
    <div
      role="status"
      aria-label="Memuat notifikasi"
      className="flex items-center justify-center gap-2 rounded-3xl border border-white/20 bg-white/70 p-4 text-xs font-medium text-zinc-500 backdrop-blur-md"
    >
      <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
      Memuat notifikasi…
    </div>
  );
}

/**
 * Daftar notifikasi — murni presentasional di atas data yang sudah digabung.
 */
function NotificationList({
  notifications,
}: {
  notifications: Parameters<typeof NotificationItem>[0]["notification"][];
}) {
  if (notifications.length === 0) {
    return <EmptyInbox />;
  }

  return (
    <ul className="space-y-3">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
        />
      ))}
    </ul>
  );
}

async function NotificationFeed() {
  /*
   * Gabung sumber tersimpan (push dari trigger: perubahan status & chat masuk)
   * dengan derived read-model pesanan sebagai fallback bila tabel `notifications`
   * belum termigrasi / kosong — ids berbeda domain sehingga dedup via Set aman.
   * Refactor ini hanya memisahkan komponen visual; kontrak data tidak berubah.
   */
  const [stored, orders] = await Promise.all([
    fetchStoredNotifications(),
    fetchOrderSummaries(),
  ]);
  const derived = buildNotifications(orders);
  const seen = new Set(stored.map((item) => item.id));
  const notifications = [
    ...stored,
    ...derived.filter((item) => !seen.has(item.id)),
  ];

  return (
    <>
      <InboxHeader total={notifications.length} />
      <NotificationList notifications={notifications} />
    </>
  );
}

export default function InboxPage() {
  return (
    <div className="flex flex-col gap-5 px-5 pt-6 pb-6">
      {/*
        Dilepas setelah item tersimpan dirender: tandai dibaca di server,
        lalu revalidate `/inbox` — badge lonceng kembali 0 di navigasi berikut.
      */}
      <MarkAllNotificationsRead />

      <Suspense
        fallback={
          <>
            <InboxHeader total={0} />
            <NotificationListSkeleton />
            <InboxSkeleton />
          </>
        }
      >
        <NotificationFeed />
      </Suspense>
    </div>
  );
}
