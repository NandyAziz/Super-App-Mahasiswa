"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
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

const EMPTY_MESSAGE: Record<TutoringTab, string> = {
  mine: "Belum ada jadwal belajar. Yuk reservasi tutor pertamamu!",
  offers: "Belum ada tawaran mengajar untuk saat ini.",
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
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-zinc-200 bg-white/60 px-6 py-10 text-center backdrop-blur-md">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
            <Plus className="h-6 w-6" />
          </span>
          <p className="text-sm text-zinc-500">{EMPTY_MESSAGE[tab]}</p>
        </div>
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
