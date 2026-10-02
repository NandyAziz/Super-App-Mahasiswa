"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Ban, CalendarClock, GraduationCap, Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/format";
import {
  acceptTutoringSessionAction,
  updateTutoringStatusAction,
} from "../actions";
import { formatSchedule } from "../schedule";
import {
  canCancelTutoringSession,
  resolveTutoringCardAction,
} from "../selectors";
import { getTutoringStatusMeta } from "../status";
import type { TutoringActionResult, TutoringSession } from "../types";

interface TutoringCardProps {
  session: TutoringSession;
  currentUserId: string;
}

export function TutoringCard({ session, currentUserId }: TutoringCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const meta = getTutoringStatusMeta(session.status);
  const action = resolveTutoringCardAction(session, currentUserId);
  const showCancel = canCancelTutoringSession(session, currentUserId);
  const isOwner = session.student_id === currentUserId;
  const isTutor = session.tutor_id === currentUserId;

  const roleLabel = isOwner
    ? "Sesi yang saya pesan"
    : isTutor
      ? "Sesi yang saya ajar"
      : "Tawaran mengajar";

  function applyResult(result: TutoringActionResult): void {
    if (result.status === "error") {
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
    router.refresh();
  }

  function runAction(): Promise<TutoringActionResult> {
    if (action?.kind === "accept") {
      return acceptTutoringSessionAction(session.id);
    }

    return updateTutoringStatusAction(
      session.id,
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
      applyResult(await updateTutoringStatusAction(session.id, "cancelled"));
    });
  }

  return (
    <article className="rounded-3xl border border-white/20 bg-white/70 p-4 shadow-sm backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md",
              meta.gradient,
            )}
          >
            <GraduationCap className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-zinc-900">
              {session.subject}
            </h3>
            <p className="text-[0.7rem] text-zinc-400">{roleLabel}</p>
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

      <div className="mt-3 space-y-2 text-xs text-zinc-600">
        <p className="flex items-center gap-2">
          <CalendarClock className="h-3.5 w-3.5 text-indigo-500" />
          {formatSchedule(session.scheduled_at)}
        </p>
        <p className="flex items-center gap-2">
          <Wallet className="h-3.5 w-3.5 text-indigo-500" />
          Tarif {formatRupiah(session.price)}
        </p>
      </div>

      {action || showCancel ? (
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
