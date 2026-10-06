"use client";

import { useState } from "react";
import { GraduationCap, Plus, Sparkles, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { selectMyStudySessions, selectTutorOffers } from "../selectors";
import type { TutoringSession } from "../types";
import { TutoringCard } from "./TutoringCard";
import { TutoringFormModal } from "./TutoringFormModal";

type TutoringTab = "mine" | "offers";

const TABS: { id: TutoringTab; label: string }[] = [
  { id: "mine", label: "Jadwal Belajarku" },
  { id: "offers", label: "Tawaran Mengajar" },
];

/** Konten empty state per tab: ikon mengundang + judul + ajakan bertindak. */
const EMPTY_STATE: Record<
  TutoringTab,
  { icon: LucideIcon; title: string; description: string; hint: string }
> = {
  mine: {
    icon: GraduationCap,
    title: "Belum ada jadwal belajar",
    description: "Reservasi tutor pertamamu dan mulai belajar bareng sekarang.",
    hint: "Tekan tombol Reservasi Tutor di atas untuk memulai.",
  },
  offers: {
    icon: Sparkles,
    title: "Belum ada tawaran mengajar",
    description:
      "Sesi belajar baru dari mahasiswa lain akan muncul di sini untuk kamu terima.",
    hint: "Sesi open yang kamu ajar akan tercatat sebagai pengalaman mengajar.",
  },
};

interface TutoringBoardProps {
  sessions: TutoringSession[];
  defaultSchedule: string;
  currentUserId: string;
}

export function TutoringBoard({
  sessions,
  defaultSchedule,
  currentUserId,
}: TutoringBoardProps) {
  const [tab, setTab] = useState<TutoringTab>("mine");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const visibleSessions =
    tab === "mine"
      ? selectMyStudySessions(sessions, currentUserId)
      : selectTutorOffers(sessions, currentUserId);

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/70 px-4 py-3.5 text-sm font-semibold text-indigo-600 shadow-sm backdrop-blur-md transition-all duration-200 active:scale-95"
      >
        <Plus className="h-5 w-5" />
        <span>Reservasi Tutor</span>
      </button>

      <div className="grid grid-cols-2 gap-1 rounded-2xl border border-white/20 bg-white/70 p-1 backdrop-blur-md">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-pressed={tab === item.id}
            className={cn(
              "rounded-xl px-2 py-2 text-xs font-semibold transition-all duration-200 active:scale-95",
              tab === item.id
                ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25"
                : "text-zinc-500 hover:text-zinc-700",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {visibleSessions.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <div className="space-y-3">
          {visibleSessions.map((session) => (
            <TutoringCard
              key={session.id}
              session={session}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}

      <TutoringFormModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultSchedule={defaultSchedule}
      />
    </div>
  );
}

/** Empty state mengundang: ikon besar + judul + ajakan bertindak. */
function EmptyState({ tab }: { tab: TutoringTab }) {
  const state = EMPTY_STATE[tab];
  const Icon = state.icon;

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-indigo-200 bg-white/60 px-6 py-12 text-center backdrop-blur-md">
      <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-50 to-violet-50 text-indigo-500 ring-1 ring-indigo-100">
        <Icon className="h-8 w-8" />
      </span>

      <div className="space-y-1">
        <p className="text-sm font-semibold text-zinc-700">{state.title}</p>
        <p className="mx-auto max-w-[34ch] text-xs leading-relaxed text-zinc-500">
          {state.description}
        </p>
      </div>

      <p className="text-[0.7rem] text-zinc-400">{state.hint}</p>
    </div>
  );
}
