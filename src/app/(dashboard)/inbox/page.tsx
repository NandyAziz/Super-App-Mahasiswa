import { Suspense } from "react";
import type { Metadata } from "next";
import { BellOff } from "lucide-react";
import { fetchOrderSummaries } from "@/features/orders/queries";
import { buildNotifications } from "@/features/notifications/build";
import { InboxSkeleton } from "@/features/notifications/components/InboxSkeleton";
import { NotificationItem } from "@/features/notifications/components/NotificationItem";

export const metadata: Metadata = {
  title: "Notifikasi · Campify",
};

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

async function NotificationFeed() {
  const orders = await fetchOrderSummaries();
  const notifications = buildNotifications(orders);

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

export default function InboxPage() {
  return (
    <div className="flex flex-col gap-5 px-5 pt-6 pb-6">
      <header>
        <h1 className="text-lg font-semibold text-zinc-900">
          Notifikasi &amp; Pesan
        </h1>
        <p className="text-xs text-zinc-500">
          Pantau kabar terbaru dari semua pesananmu.
        </p>
      </header>

      <Suspense fallback={<InboxSkeleton />}>
        <NotificationFeed />
      </Suspense>
    </div>
  );
}
