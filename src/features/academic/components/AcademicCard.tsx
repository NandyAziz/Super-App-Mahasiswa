"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Ban, FileText, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getUrlLabel } from "@/lib/format";
import { updateAcademicStatusAction } from "../actions";
import {
  canCancelAcademicService,
  resolveAcademicCardAction,
} from "../selectors";
import { getAcademicServiceTypeMeta } from "../service-types";
import { getAcademicStatusMeta } from "../status";
import type {
  AcademicActionResult,
  AcademicProgressStatus,
  AcademicService,
} from "../types";

interface AcademicCardProps {
  service: AcademicService;
}

export function AcademicCard({ service }: AcademicCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const typeMeta = getAcademicServiceTypeMeta(service.service_type);
  const statusMeta = getAcademicStatusMeta(service.status);
  const action = resolveAcademicCardAction(service.status);
  const showCancel = canCancelAcademicService(service.status);
  const TypeIcon = typeMeta.icon;

  function applyResult(result: AcademicActionResult): void {
    if (result.status === "error") {
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
    router.refresh();
  }

  function runStatus(nextStatus: AcademicProgressStatus): void {
    startTransition(async () => {
      applyResult(await updateAcademicStatusAction(service.id, nextStatus));
    });
  }

  return (
    <article className="rounded-3xl border border-white/20 bg-white/70 p-4 shadow-sm backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md",
              typeMeta.gradient,
            )}
          >
            <TypeIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-zinc-900">
              {typeMeta.label}
            </h3>
            <p className="truncate text-[0.7rem] text-zinc-400">
              {typeMeta.description}
            </p>
          </div>
        </div>

        <span
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-1 text-[0.65rem] font-semibold",
            statusMeta.badge,
          )}
        >
          {statusMeta.label}
        </span>
      </div>

      <div className="mt-3 space-y-2 text-xs text-zinc-600">
        {service.document_url ? (
          <a
            href={service.document_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-w-0 items-center gap-2 text-indigo-600 transition-all duration-200 active:scale-95"
          >
            <Link2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {getUrlLabel(service.document_url)}
            </span>
          </a>
        ) : (
          <p className="flex items-center gap-2 text-zinc-400">
            <Link2 className="h-3.5 w-3.5" />
            Tanpa lampiran dokumen
          </p>
        )}

        {service.notes ? (
          <p className="flex items-start gap-2">
            <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
            <span>{service.notes}</span>
          </p>
        ) : null}
      </div>

      {action || showCancel ? (
        <div className="mt-3 flex gap-2">
          {action ? (
            <button
              type="button"
              onClick={() => runStatus(action.nextStatus)}
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
              onClick={() => runStatus("cancelled")}
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
