"use client";

import { useMemo, useState } from "react";
import { ClipboardList, History, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { filterAdminOrders, type AdminQueueTab } from "../selectors";
import type { AdminOrder, AdminOverview, AdminServiceFilter } from "../types";
import { AdminOrderTable } from "./AdminOrderTable";
import { AdminOverviewCards } from "./AdminOverviewCards";

interface AdminDashboardProps {
  orders: AdminOrder[];
  overview: AdminOverview;
}

interface FilterTab {
  id: AdminServiceFilter;
  label: string;
}

/** Tab filter layanan: All + 5 layanan Campify. */
const FILTER_TABS: FilterTab[] = [
  { id: "all", label: "Semua" },
  { id: "jastip", label: "Jastip" },
  { id: "printing", label: "Print" },
  { id: "projects", label: "Coding" },
  { id: "tutoring", label: "Tutoring" },
  { id: "academic", label: "Akademik" },
];

const QUEUE_TABS: { id: AdminQueueTab; label: string }[] = [
  { id: "active", label: "Pesanan Aktif" },
  { id: "history", label: "Riwayat / Selesai" },
];

function emptyMessageFor(queue: AdminQueueTab, filter: AdminServiceFilter): string {
  if (queue === "history") {
    return "Belum ada riwayat selesai/dibatalkan pada filter ini.";
  }
  if (filter === "all") {
    return "Tidak ada pesanan aktif. Antrean bersih! 🎉";
  }
  return "Tidak ada pesanan aktif pada layanan ini.";
}

export function AdminDashboard({ orders, overview }: AdminDashboardProps) {
  // Antrean Aktif adalah tampilan default agar operator fokus ke kerja.
  const [queue, setQueue] = useState<AdminQueueTab>("active");
  const [filter, setFilter] = useState<AdminServiceFilter>("all");
  const [query, setQuery] = useState("");

  const activeCount = useMemo(
    () => orders.filter((order) => filterAdminOrders([order], "active", "all", "").length > 0).length,
    [orders],
  );
  const visibleOrders = useMemo(
    () => filterAdminOrders(orders, queue, filter, query),
    [orders, queue, filter, query],
  );

  return (
    // `w-full min-w-0` mencegah kontainer menyusut mengikuti lebar isi tabel
    // (flex item default `min-width: auto`), sehingga `overflow-x-auto`
    // pada AdminOrderTable bekerja dan halaman tidak scroll horizontal.
    <div className="flex w-full min-w-0 flex-col gap-4">
      <AdminOverviewCards overview={overview} />

      <div
        role="tablist"
        aria-label="Antrean pesanan"
        className="grid grid-cols-2 gap-1 rounded-2xl border border-white/20 bg-white/70 p-1 backdrop-blur-md"
      >
        {QUEUE_TABS.map((tab) => {
          const label =
            tab.id === "active" ? `Pesanan Aktif (${activeCount})` : tab.label;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={queue === tab.id}
              onClick={() => setQueue(tab.id)}
              className={cn(
                "rounded-xl px-2 py-2 text-[0.7rem] font-semibold transition-all duration-200 active:scale-95",
                queue === tab.id
                  ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25"
                  : "text-zinc-500 hover:text-zinc-700",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      <label className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/70 px-3 py-2.5 backdrop-blur-md">
        <Search className="h-4 w-4 shrink-0 text-zinc-400" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari nama, no. HP, atau layanan…"
          aria-label="Cari pesanan"
          className="w-full bg-transparent text-xs text-zinc-800 outline-none placeholder:text-zinc-400"
        />
      </label>

      <div
        role="tablist"
        aria-label="Filter layanan"
        className="grid grid-cols-3 gap-1 rounded-2xl border border-white/20 bg-white/70 p-1 backdrop-blur-md"
      >
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={filter === tab.id}
            onClick={() => setFilter(tab.id)}
            className={cn(
              "rounded-xl px-2 py-2 text-[0.7rem] font-semibold transition-all duration-200 active:scale-95",
              filter === tab.id
                ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25"
                : "text-zinc-500 hover:text-zinc-700",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {queue === "history" && visibleOrders.length === 0 && query.trim() === "" ? (
        <EmptyState
          icon={History}
          title="Belum ada riwayat"
          description={emptyMessageFor(queue, filter)}
          hint="Pesanan selesai/dibatalkan akan diarsipkan otomatis di sini."
        />
      ) : (
        <AdminOrderTable
          orders={visibleOrders}
          emptyMessage={emptyMessageFor(queue, filter)}
          emptyIcon={ClipboardList}
        />
      )}
    </div>
  );
}

