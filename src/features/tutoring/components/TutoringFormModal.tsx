"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BookOpen, Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";
import { TextField } from "@/components/ui/TextField";
import { createTutoringSessionAction } from "../actions";
import { startSnapPayment } from "@/features/payment/start-snap-payment";
import { TUTORING_FLAT_RATE } from "../schemas";
import type { TutoringActionResult } from "../types";

interface TutoringFormModalProps {
  open: boolean;
  onClose: () => void;
  defaultSchedule: string;
}

/**
 * Modal reservasi tutor yang disederhanakan: tanpa pemilihan tutor (semua
 * permintaan terbuka untuk seluruh tutor) dan tanpa input tarif manual —
 * biaya memakai tarif flat per sesi (`TUTORING_FLAT_RATE`).
 */
export function TutoringFormModal({
  open,
  onClose,
  defaultSchedule,
}: TutoringFormModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [schedule, setSchedule] = useState(defaultSchedule);

  function resetForm(): void {
    setFieldErrors({});
    setSchedule(defaultSchedule);
  }

  function applyResult(result: TutoringActionResult): void {
    if (result.status === "error") {
      setFieldErrors(result.fieldErrors ?? {});
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
    resetForm();
    onClose();
    router.refresh();

    // Submit → bayar tanpa langkah manual: tarif flat selalu > 0 sehingga
    // `createMidtransSnapToken` + `window.snap.pay` langsung dijalankan.
    const order = result.order;
    if (order && order.price > 0) {
      void startSnapPayment(
        {
          id: order.id,
          title: order.subject,
          service: "tutoring",
          amount: order.price,
        },
        { onFinished: () => router.refresh() },
      );
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      applyResult(await createTutoringSessionAction(formData));
    });
  }

  return (
    <Modal open={open} title="Reservasi Tutor" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <TextField
          id="subject"
          name="subject"
          label="Mata Kuliah"
          placeholder="Kalkulus II"
          icon={BookOpen}
          error={fieldErrors.subject}
          disabled={isPending}
          required
        />

        <TextField
          id="scheduled_at"
          name="scheduled_at"
          type="datetime-local"
          label="Tanggal & Waktu Belajar"
          value={schedule}
          onChange={(event) => setSchedule(event.target.value)}
          error={fieldErrors.scheduled_at}
          disabled={isPending}
          required
        />

        <div className="flex items-center justify-between rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3">
          <span className="flex items-center gap-1.5 text-xs font-medium text-indigo-600">
            <Wallet className="h-4 w-4" />
            Tarif Sesi
          </span>
          <span className="text-base font-bold text-slate-900">
            {formatRupiah(TUTORING_FLAT_RATE)}
          </span>
        </div>

        <p className="text-[0.7rem] leading-relaxed text-slate-400">
          Pengajuan ini terbuka untuk semua tutor yang tersedia. Tarif sudah
          ditetapkan flat per sesi.
        </p>

        <button
          type="submit"
          disabled={isPending}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <BookOpen className="h-4 w-4" />
          )}
          <span>{isPending ? "Mengirim..." : "Ajukan Sesi Belajar"}</span>
        </button>
      </form>
    </Modal>
  );
}
