"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Ban, CalendarClock, Code2, Loader2, MessageCircle, Tag, UserRound, Wallet } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/format";
import { takeProjectAction, updateProjectStatusAction } from "../actions";
import { buildWhatsAppLink, parseProjectDescription } from "../metadata";
import { canCancelProject, resolveProjectCardAction } from "../selectors";
import { getProjectStatusMeta } from "../status";
import type { CodingProject, ProjectActionResult } from "../types";

interface ProjectCardProps {
  project: CodingProject;
  currentUserId: string;
}

export function ProjectCard({ project, currentUserId }: ProjectCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const meta = getProjectStatusMeta(project.status);
  const action = resolveProjectCardAction(project, currentUserId);
  const showCancel = canCancelProject(project, currentUserId);
  const isOwner = project.client_id === currentUserId;
  const isFreelancer = project.freelancer_id === currentUserId;

  const roleLabel = isOwner
    ? "Proyek saya (client)"
    : isFreelancer
      ? "Saya yang mengerjakan"
      : "Proyek mahasiswa lain";

  function applyResult(result: ProjectActionResult): void {
    if (result.status === "error") {
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
    router.refresh();
  }

  function runAction(): Promise<ProjectActionResult> {
    if (action?.kind === "take") {
      return takeProjectAction(project.id);
    }

    return updateProjectStatusAction(
      project.id,
      action?.nextStatus ?? "in_progress",
    );
  }

  function handleAction(): void {
    startTransition(async () => {
      applyResult(await runAction());
    });
  }

  function handleCancel(): void {
    startTransition(async () => {
      applyResult(await updateProjectStatusAction(project.id, "cancelled"));
    });
  }

  // Metadata (deadline, WA klien) dipadatkan di kolom `description` — dibaca
  // balik agar kartu bisa menampilkan chip tenggat & tombol WhatsApp klien.
  const parsed = parseProjectDescription(project.description);
  const whatsappLink = parsed.whatsapp
    ? buildWhatsAppLink(parsed.whatsapp)
    : null;
  const techTags = project.tech_stack.slice(0, 3);
  // Identitas klien hanya relevan bila penonton bukan pemilik proyek.
  const clientLabel = isOwner ? null : project.client_name;

  return (
    <article className="group rounded-2xl border border-white/20 bg-white/70 p-4 shadow-sm backdrop-blur-md transition-all duration-200 hover:border-indigo-200/70 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md",
              meta.gradient,
            )}
          >
            <Code2 className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-slate-900">
              {project.title}
            </h3>
            <p className="flex items-center gap-1 text-[0.7rem] text-zinc-400">
              <UserRound className="h-3 w-3" />
              {roleLabel}
            </p>
          </div>
        </div>

        <span
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-1 text-[0.65rem] font-semibold",
            meta.badge,
          )}
        >
          {meta.label}
        </span>
      </div>

      <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-600">
        {parsed.instructions}
      </p>

      {/* Chip: identitas klien, tag teknologi (kategori), dan tenggat. */}
      {clientLabel || techTags.length > 0 || parsed.deadline ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {clientLabel ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[0.65rem] font-medium text-slate-700">
              <UserRound className="h-3 w-3 text-indigo-500" />
              {clientLabel}
            </span>
          ) : null}

          {techTags.map((tech) => (
            <span
              key={tech}
              className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[0.65rem] font-medium text-indigo-700"
            >
              <Tag className="h-3 w-3" />
              {tech}
            </span>
          ))}

          {parsed.deadline ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-[0.65rem] font-medium text-amber-700">
              <CalendarClock className="h-3 w-3" />
              {parsed.deadline}
            </span>
          ) : null}
        </div>
      ) : null}

      {/* Budget tampil menonjol dengan tipografi tebal. */}
      <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
        <span className="flex items-center gap-1.5 text-[0.7rem] font-medium text-slate-500">
          <Wallet className="h-3.5 w-3.5 text-indigo-500" />
          Budget
        </span>
        <span className="text-lg font-bold text-slate-900">
          {formatRupiah(project.budget)}
        </span>
      </div>

      {action || showCancel || (!isOwner && whatsappLink) ? (
        <div className="mt-3 flex gap-2">
          {action ? (
            <button
              type="button"
              onClick={handleAction}
              disabled={isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/30 transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span>{isPending ? "Memproses..." : action.label}</span>
            </button>
          ) : null}

          {/* Tombol kontak WhatsApp klien dengan lencana ikon hijau. */}
          {!isOwner && whatsappLink ? (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-700 transition-all duration-200 active:scale-95"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                <MessageCircle className="h-3 w-3" />
              </span>
              WhatsApp
            </a>
          ) : null}

          {showCancel ? (
            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending}
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-600 transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Ban className="h-3.5 w-3.5" />
              <span>Batalkan</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
