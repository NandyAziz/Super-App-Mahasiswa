"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ImageUp,
  Loader2,
  MessageCircle,
  QrCode,
  ShieldCheck,
  Timer,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";
import { getOrderServiceMeta } from "@/features/orders/service-meta";
import type { OrderService } from "@/features/orders/types";
import { submitPaymentProofAction } from "../actions";
import { uploadPaymentProof } from "../upload";

/** Gambar QRIS merchant statis (ganti berkas dengan QR merchant asli). */
const QRIS_IMAGE_SRC = "/images/qris-merchant.png";

/** Nomor WhatsApp CS (format internasional tanpa tanda `+`). */
const CS_WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_CS_WHATSAPP ?? "6281234567890";

/** Kode pesanan singkat & stabil untuk dibaca/disebut ke CS. */
function formatOrderCode(orderId: string): string {
  const compact = orderId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return `#CMP-${compact.slice(0, 8)}`;
}

/** Tautan WhatsApp CS dengan pesan berisi kode pesanan terkait. */
function buildCsWhatsAppLink(orderCode: string): string {
  const text = `Halo CS Campify, saya butuh bantuan pembayaran untuk pesanan ${orderCode}.`;
  return `https://wa.me/${CS_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

/** Ringkasan order yang bisa dibayar — amount sudah pasti terisi & lebih dari 0. */
export interface PayableOrder {
  id: string;
  title: string;
  service: OrderService;
  amount: number;
}

interface QrisPaymentModalProps {
  open: boolean;
  onClose: () => void;
  order: PayableOrder;
}

/**
 * Modal pembayaran manual QRIS: menampilkan QR merchant statis + total tagihan,
 * lalu meminta bukti transfer. Setelah bukti diunggah, pesanan berpindah ke
 * `PENDING_VERIFICATION` untuk diverifikasi operator.
 */
export function QrisPaymentModal({
  open,
  onClose,
  order,
}: QrisPaymentModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const serviceMeta = getOrderServiceMeta(order.service);
  const orderCode = formatOrderCode(order.id);
  const csWhatsAppLink = buildCsWhatsAppLink(orderCode);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0] ?? null;
    setProofFile(file);
    setError(null);
  }

  function handleSubmit(): void {
    if (!proofFile) {
      setError("Lampirkan bukti pembayaran terlebih dahulu.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const proofUrl = await uploadPaymentProof(proofFile);
        const result = await submitPaymentProofAction({
          orderId: order.id,
          serviceName: order.service,
          proofUrl,
        });

        if (result.status === "error") {
          setError(result.message);
          toast.error(result.message);
          return;
        }

        toast.success(result.message);
        setProofFile(null);
        onClose();
        router.refresh();
      } catch (cause) {
        const message =
          cause instanceof Error
            ? cause.message
            : "Gagal mengirim bukti pembayaran.";
        setError(message);
        toast.error(message);
      }
    });
  }

  return (
    <Modal open={open} title="Pembayaran QRIS" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-indigo-100 bg-gradient-to-b from-indigo-50/80 to-white p-5">
          <div className="rounded-2xl border border-zinc-100 bg-white p-3 shadow-sm">
            <Image
              src={QRIS_IMAGE_SRC}
              alt="Kode QRIS merchant Campify"
              width={240}
              height={240}
              priority
              className="h-56 w-56 object-contain"
            />
          </div>
          <p className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[0.65rem] font-semibold text-indigo-600">
            <QrCode className="h-3.5 w-3.5" />
            QRIS Merchant · Campify
          </p>
        </div>

        <div className="space-y-2 rounded-2xl border border-white/20 bg-zinc-50/80 p-4">
          <p className="text-[0.7rem] font-semibold tracking-wide text-indigo-500 uppercase">
            Ringkasan Pesanan
          </p>
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-zinc-500">Layanan</span>
            <span className="truncate font-semibold text-zinc-800">
              {serviceMeta.label}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-zinc-500">Item</span>
            <span className="truncate font-semibold text-zinc-800">
              {order.title}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-zinc-500">Order ID</span>
            <span className="font-mono font-semibold text-zinc-800">
              {orderCode}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-zinc-200 pt-2 text-sm">
            <span className="font-semibold text-zinc-900">Total Pembayaran</span>
            <span className="font-bold text-zinc-900">
              {formatRupiah(order.amount)}
            </span>
          </div>
        </div>

        <p className="text-[0.7rem] leading-relaxed text-zinc-400">
          Pindai QR di atas dengan aplikasi e-wallet / m-banking apa pun, bayar
          sesuai nominal (cantumkan Order ID {orderCode} pada berita transfer),
          lalu unggah bukti transfer untuk diverifikasi operator.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 py-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
            <span className="text-[0.7rem] leading-tight font-semibold text-emerald-700">
              Garansi 100% Layanan
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-3 py-2">
            <Timer className="h-4 w-4 shrink-0 text-indigo-600" />
            <span className="text-[0.7rem] leading-tight font-semibold text-indigo-700">
              Verifikasi 1–5 menit
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <ImageUp className="h-3.5 w-3.5 text-indigo-500" />
            Bukti Pembayaran / Transfer
          </span>
          <label
            className={cn(
              "flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-dashed px-4 py-3 text-xs transition-all duration-200 active:scale-95",
              error
                ? "border-rose-300 bg-rose-50/60"
                : "border-slate-300 bg-white",
              isPending && "pointer-events-none opacity-60",
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              <Upload className="h-4 w-4 shrink-0 text-slate-500" />
              <span className="truncate font-medium text-slate-700">
                {proofFile ? proofFile.name : "Pilih gambar bukti (JPG/PNG)"}
              </span>
            </span>
            <span className="shrink-0 text-[0.65rem] text-slate-400">
              {proofFile
                ? `${(proofFile.size / 1024 / 1024).toFixed(2)} MB`
                : "maks 5 MB"}
            </span>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleFileChange}
              disabled={isPending}
            />
          </label>
          {error ? (
            <p className="text-[0.7rem] font-medium text-rose-500">{error}</p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || !proofFile}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImageUp className="h-4 w-4" />
          )}
          <span>{isPending ? "Mengirim..." : "Kirim Bukti Pembayaran"}</span>
        </button>

        <a
          href={csWhatsAppLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white px-4 py-2.5 text-xs font-semibold text-emerald-700 transition-all duration-200 active:scale-95"
        >
          <MessageCircle className="h-4 w-4" />
          Butuh bantuan pembayaran? Chat CS via WhatsApp
        </a>
      </div>
    </Modal>
  );
}
