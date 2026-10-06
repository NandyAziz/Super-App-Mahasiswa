"use client";

import { useState } from "react";
import { History, Truck, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { ORDER_RUNNING_STATUSES } from "@/features/orders/types";
import type { AcademicService } from "../types";
import { AcademicCard } from "./AcademicCard";

type AcademicQueue = "running" | "history";

const QUEUE_TABS: { id: AcademicQueue; label: string }[] = [
  { id: "running", label: "Pesanan Berjalan" },
  { id: "history", label: "Riwayat Selesai" },
];

/** Konten empty state per tab: ikon mengundang + judul + ajakan bertindak. */
const EMPTY_STATE: Record<
  AcademicQueue,
  { icon: LucideIcon; title: string; description: string; hint: string }
> = {
  running: {
    icon: Truck,
    title: "Tidak ada bantuan berjalan 🎉",
    description:
      "Semua pengajuanmu sudah selesai. Pengajuan yang sedang diproses akan tampil di sini.",
    hint: "Ajukan bantuan akademik baru lewat form di atas.",
  },
  history: {
    icon: History,
    title: "Belum ada riwayat selesai",
    description:
      "Pengajuan yang sudah selesai atau dibatalkan akan tersimpan rapi di sini.",
    hint: "Ajukan bantuan pertamamu untuk memulai.",
  },
};

function isRunning(status: AcademicService["status"]): boolean {
  return ORDER_RUNNING_STATUSES.includes(status);
}

interface AcademicBoardProps {
  services: AcademicService[];
}

/**
 * Riwayat pengajuan bantuan akademik dengan split Aktif/Riwayat. Form
 * pengajuan dirender inline di halaman `/academic`, jadi board ini fokus
 * menampilkan & memfilter riwayat.
 */
export function AcademicBoard({ services }: AcademicBoardProps) {
  const [queue, setQueue] = useState<AcademicQueue>("running");

  const runningCount = services.filter((service) =>
    isRunning(service.status),
  ).length;
  const visibleServices = services.filter((service) =>
    queue === "running"
      ? isRunning(service.status)
      : !isRunning(service.status),
  );

  if (visibleServices.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <QueueToggle queue={queue} onChange={setQueue} runningCount={runningCount} />
        <EmptyState {...EMPTY_STATE[queue]} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <QueueToggle queue={queue} onChange={setQueue} runningCount={runningCount} />
      <div className="space-y-3">
        {visibleServices.map((service) => (
          <AcademicCard key={service.id} service={service} />
        ))}
      </div>
    </div>
  );
}

function QueueToggle({
  queue,
  onChange,
  runningCount,
}: {
  queue: AcademicQueue;
  onChange: (queue: AcademicQueue) => void;
  runningCount: number;
}) {
  return (
    <div
      role="tablist"
      aria-label="Filter riwayat akademik"
      className="grid grid-cols-2 gap-1 rounded-2xl border border-white/20 bg-white/70 p-1 backdrop-blur-md"
    >
      {QUEUE_TABS.map((item) => {
        const label =
          item.id === "running"
            ? `Pesanan Berjalan (${runningCount})`
            : item.label;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={queue === item.id}
            onClick={() => onChange(item.id)}
            className={cn(
              "rounded-xl px-2 py-2 text-[0.7rem] font-semibold transition-all duration-200 active:scale-95",
              queue === item.id
                ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25"
                : "text-zinc-500 hover:text-zinc-700",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
