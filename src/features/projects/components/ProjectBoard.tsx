"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { selectMarketplaceProjects, selectMyProjects } from "../selectors";
import type { CodingProject } from "../types";
import { ProjectCard } from "./ProjectCard";
import { ProjectFormModal } from "./ProjectFormModal";

type ProjectTab = "marketplace" | "mine";

const TABS: { id: ProjectTab; label: string }[] = [
  { id: "marketplace", label: "Marketplace Proyek" },
  { id: "mine", label: "Proyek Saya" },
];

const EMPTY_MESSAGE: Record<ProjectTab, string> = {
  marketplace: "Belum ada proyek open. Jadi yang pertama posting?",
  mine: "Kamu belum posting atau mengerjakan proyek apa pun.",
};

interface ProjectBoardProps {
  projects: CodingProject[];
  currentUserId: string;
}

export function ProjectBoard({ projects, currentUserId }: ProjectBoardProps) {
  const [tab, setTab] = useState<ProjectTab>("marketplace");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const visibleProjects =
    tab === "marketplace"
      ? selectMarketplaceProjects(projects, currentUserId)
      : selectMyProjects(projects, currentUserId);

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/70 px-4 py-3.5 text-sm font-semibold text-indigo-600 shadow-sm backdrop-blur-md transition-all duration-200 active:scale-95"
      >
        <Plus className="h-5 w-5" />
        <span>Post Proyek Baru</span>
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

      {visibleProjects.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-zinc-200 bg-white/60 px-6 py-10 text-center backdrop-blur-md">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
            <Plus className="h-6 w-6" />
          </span>
          <p className="text-sm text-zinc-500">{EMPTY_MESSAGE[tab]}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}

      <ProjectFormModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
