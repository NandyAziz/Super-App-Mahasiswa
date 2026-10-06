"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Ban, CalendarClock, Loader2, Phone } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  buildDocumentDownloadUrl,
  getDownloadFileName,
} from "@/lib/format";
import { updateAcademicStatusAction } from "../actions";
import {
  canCancelAcademicService,
  resolveAcademicCardAction,
} from "../selectors";
import { parseAcademicNotes } from "../request-types";
import { getAcademicServiceTypeMeta } from "../service-types";
import { getAcademicStatusMeta } from "../status";
import type {
  AcademicActionResult,
  AcademicProgressStatus,
  AcademicService,
} from "../types";

/** Ekstensi berkas dari URL lampiran (mis. `.pdf` → "PDF"); fallback "PDF". */
function resolveFileExtension(url: string): string {
  try {
    const lastSegment =
      new URL(url).pathname.split("/").filter(Boolean).at(-1) ?? "";
    const dotIndex = lastSegment.lastIndexOf(".");
    const extension =
      dotIndex > 0 ? lastSegment.slice(dotIndex + 1).trim() : "";
    if (/^[a-z0-9]{1,5}$/i.test(extension)) {
      return extension.toUpperCase();
    }
  } catch {
    // URL tidak valid — jatuh ke fallback di bawah.
  }
  return "PDF";
}

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

  // Pisahkan blob `notes` menjadi field terstruktur (bukan string gabungan).
  const meta = parseAcademicNotes(service.notes);
  // Lampiran utama = `document_url`; cadangan dari notes untuk baris lama.
  const attachmentUrl = service.document_url || meta.rubricUrl || null;

  const statusAction = action && action.kind === "status" ? action : null;
  const acknowledgeAction =
    action && action.kind === "acknowledge" ? action : null;

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

  /**
   * Tanda terima akhir pelanggan. Status sudah `completed` (terminal) sehingga
   * tidak ada transisi berikutnya — cukup konfirmasi tampilan.
   */
  function acknowledge(): void {
    toast.success("Terima kasih! Kamu telah mengonfirmasi penerimaan hasil.");
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

      {/* Meta row: nomor WhatsApp + deadline sebagai badge ikon. */}
      {meta.whatsapp || meta.deadline ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {meta.whatsapp ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[0.65rem] font-medium text-slate-700">
              <Phone className="h-3 w-3 text-indigo-500" />
              {meta.whatsapp}
            </span>
          ) : null}
          {meta.deadline ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[0.65rem] font-medium text-slate-700">
              <CalendarClock className="h-3 w-3 text-indigo-500" />
              {meta.deadline}
            </span>
          ) : null}
        </div>
      ) : null}

      {/* Chip lampiran: tautan klik ke berkas Supabase Storage / Drive. */}
      {attachmentUrl ? (
        <a
          href={buildDocumentDownloadUrl(
            attachmentUrl,
            getDownloadFileName(attachmentUrl),
          )}
          download={getDownloadFileName(attachmentUrl)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex w-full items-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-600 transition-all duration-200 active:scale-95"
        >
          <span aria-hidden="true">📎</span>
          <span className="truncate">
            Lihat Lampiran {resolveFileExtension(attachmentUrl)}
          </span>
        </a>
      ) : null}

      {/* Kotak instruksi khusus dari pelanggan. */}
      {meta.instructions ? (
        <div className="mt-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-700 whitespace-pre-wrap">
          <span className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">
            Instruksi Khusus
          </span>
          {meta.instructions}
        </div>
      ) : null}

      {statusAction || acknowledgeAction || showCancel ? (
        <div className="mt-3 flex gap-2">
          {statusAction ? (
            <button
              type="button"
              onClick={() => runStatus(statusAction.nextStatus)}
              disabled={isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/30 transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span>{isPending ? "Memproses..." : statusAction.label}</span>
            </button>
          ) : null}

          {acknowledgeAction ? (
            <button
              type="button"
              onClick={acknowledge}
              disabled={isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-emerald-500/30 transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span>{acknowledgeAction.label}</span>
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
