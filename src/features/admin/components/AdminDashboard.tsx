"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
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

const EMPTY_MESSAGE: Record<AdminServiceFilter, string> = {
  all: "Belum ada pesanan masuk dari seluruh layanan.",
  jastip: "Belum ada pesanan Jastip.",
  printing: "Belum ada pesanan cetak (Print).",
  projects: "Belum ada proyek Coding.",
  tutoring: "Belum ada sesi Tutoring.",
  academic: "Belum ada pengajuan layanan Akademik.",
};

function filterOrders(
  orders: AdminOrder[],
  filter: AdminServiceFilter,
): AdminOrder[] {
  if (filter === "all") {
    return orders;
  }

  return orders.filter((order) => order.service === filter);
}

export function AdminDashboard({ orders, overview }: AdminDashboardProps) {
  const [filter, setFilter] = useState<AdminServiceFilter>("all");
  const visibleOrders = filterOrders(orders, filter);

  return (
    <div className="flex flex-col gap-4">
      <AdminOverviewCards overview={overview} />

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

      <AdminOrderTable
        orders={visibleOrders}
        emptyMessage={EMPTY_MESSAGE[filter]}
      />
    </div>
  );
}
