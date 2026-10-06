"use client";

import { useMemo, useState } from "react";
import { Code2, Plus, Search, Sparkles, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseProjectDescription } from "../metadata";
import { selectMarketplaceProjects, selectMyProjects } from "../selectors";
import type { CodingProject } from "../types";
import { ProjectCard } from "./ProjectCard";
import { ProjectFormModal } from "./ProjectFormModal";

type ProjectTab = "marketplace" | "mine";

const TABS: { id: ProjectTab; label: string }[] = [
  { id: "marketplace", label: "Marketplace Proyek" },
  { id: "mine", label: "Proyek Saya" },
];

/** Konten empty state per tab: ikon mengundang + judul + ajakan bertindak. */
const EMPTY_STATE: Record<
  ProjectTab,
  { icon: LucideIcon; title: string; description: string; hint: string }
> = {
  marketplace: {
    icon: Sparkles,
    title: "Belum ada proyek open",
    description:
      "Belum ada kebutuhan coding yang dicari freelancer. Cek lagi nanti ya!",
    hint: "Punya tugas atau proyek IT? Tekan Post Proyek Baru untuk memulai.",
  },
  mine: {
    icon: Code2,
    title: "Kamu belum punya proyek",
    description:
      "Proyek yang kamu posting atau kamu kerjakan akan tampil di sini.",
    hint: "Tekan Post Proyek Baru untuk menerbitkan proyek pertamamu.",
  },
};

/** Menyaring proyek secara klien: judul, instruksi, atau tag teknologi. */
function matchesQuery(project: CodingProject, query: string): boolean {
  const haystack = [
    project.title,
    parseProjectDescription(project.description).instructions,
    ...project.tech_stack,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

interface ProjectBoardProps {
  projects: CodingProject[];
  currentUserId: string;
}

export function ProjectBoard({ projects, currentUserId }: ProjectBoardProps) {
  const [tab, setTab] = useState<ProjectTab>("marketplace");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [query, setQuery] = useState("");

  const visibleProjects = useMemo(() => {
    const base =
      tab === "marketplace"
        ? selectMarketplaceProjects(projects, currentUserId)
        : selectMyProjects(projects, currentUserId);

    const normalized = query.trim().toLowerCase();
    return normalized === ""
      ? base
      : base.filter((project) => matchesQuery(project, normalized));
  }, [projects, currentUserId, tab, query]);

  const isSearching = query.trim() !== "";

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

      {/* Search bar mengambang dengan efek blur halus. */}
      <div className="flex items-center gap-2 rounded-2xl border border-white/30 bg-white/70 px-3.5 py-2.5 shadow-sm backdrop-blur-md transition-all duration-200 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100">
        <Search className="h-4 w-4 shrink-0 text-indigo-400" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari proyek atau teknologi…"
          aria-label="Cari proyek"
          className="w-full min-w-0 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
        />
        {isSearching ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Bersihkan pencarian"
            className="shrink-0 rounded-full p-1 text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-600 active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

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
        isSearching ? (
          <SearchEmptyState query={query} onClear={() => setQuery("")} />
        ) : (
          <EmptyState tab={tab} />
        )
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

/** Empty state mengundang: ikon besar + judul + ajakan bertindak. */
function EmptyState({ tab }: { tab: ProjectTab }) {
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

/** Empty state khusus pencarian yang tidak menemukan hasil. */
function SearchEmptyState({
  query,
  onClear,
}: {
  query: string;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-indigo-200 bg-white/60 px-6 py-12 text-center backdrop-blur-md">
      <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-50 to-violet-50 text-indigo-500 ring-1 ring-indigo-100">
        <Search className="h-8 w-8" />
      </span>

      <div className="space-y-1">
        <p className="text-sm font-semibold text-zinc-700">Tidak ada hasil</p>
        <p className="mx-auto max-w-[34ch] text-xs leading-relaxed text-zinc-500">
          Tidak ada proyek yang cocok dengan &ldquo;{query.trim()}&rdquo;.
        </p>
      </div>

      <button
        type="button"
        onClick={onClear}
        className="rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-xs font-semibold text-indigo-600 transition-all duration-200 active:scale-95"
      >
        Bersihkan pencarian
      </button>
    </div>
  );
}
