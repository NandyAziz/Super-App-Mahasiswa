"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Banknote,
  CreditCard,
  Loader2,
  MessageCircle,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Timer,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { formatOrderCode, formatRupiah } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";
import { loadMidtransSnapScript } from "@/lib/midtrans";
import { getOrderServiceMeta } from "@/features/orders/service-meta";
import { createMidtransSnapToken } from "../actions";
import { resolveCustomerInfo } from "../customer";
import type { PayableOrder, SnapItemDetail } from "../types";

/** Nomor WhatsApp CS (format internasional tanpa tanda `+`). */
const CS_WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_CS_WHATSAPP ?? "6281234567890";

/** Metode pembayaran yang tersedia di jendela Snap Midtrans. */
const PAYMENT_METHODS: { icon: LucideIcon; label: string }[] = [
  { icon: QrCode, label: "QRIS" },
  { icon: Banknote, label: "Virtual Account" },
  { icon: Wallet, label: "E-Wallet" },
  { icon: CreditCard, label: "Kartu" },
];

/** Tautan WhatsApp CS dengan pesan berisi kode pesanan terkait. */
function buildCsWhatsAppLink(orderCode: string): string {
  const text = `Halo CS Campify, saya butuh bantuan pembayaran untuk pesanan ${orderCode}.`;
  return `https://wa.me/${CS_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

interface SnapPaymentModalProps {
  open: boolean;
  onClose: () => void;
  order: PayableOrder;
}

/** Status persiapan pembayaran di dalam modal checkout. */
type PreparePhase = "loading" | "ready" | "error";

/**
 * Modal checkout Midtrans Snap: memuat skrip `snap.js`, meminta token via
 * Server Action `createMidtransSnapToken`, lalu menjalankan `window.snap.pay`.
 * `onSuccess`/`onPending` memberi toast instan + `router.refresh()` (revalidasi
 * rute) — sumber kebenaran status tetap webhook Midtrans.
 */
export function SnapPaymentModal({
  open,
  onClose,
  order,
}: SnapPaymentModalProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<PreparePhase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [snapToken, setSnapToken] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const serviceMeta = getOrderServiceMeta(order.service);
  const orderCode = formatOrderCode(order.service, order.id);
  const csWhatsAppLink = buildCsWhatsAppLink(orderCode);

  // Siapkan skrip Snap + token setiap modal dibuka / percobaan diulang.
  // `setState` hanya dipanggil setelah `await` (aman untuk React hooks).
  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    async function prepare(): Promise<void> {
      try {
        await loadMidtransSnapScript();
        const customerInfo = await resolveCustomerInfo();
        const itemDetails: SnapItemDetail[] = [
          { id: order.id, name: order.title, price: order.amount, quantity: 1 },
        ];
        const result = await createMidtransSnapToken(
          order.id,
          order.amount,
          customerInfo,
          itemDetails,
        );

        if (cancelled) {
          return;
        }

        if (result.status === "error") {
          setError(result.message);
          setPhase("error");
          return;
        }

        setSnapToken(result.token);
        setPhase("ready");
      } catch (cause) {
        if (cancelled) {
          return;
        }
        setError(
          cause instanceof Error
            ? cause.message
            : "Gagal menyiapkan pembayaran. Silakan coba lagi.",
        );
        setPhase("error");
      }
    }

    void prepare();

    return () => {
      cancelled = true;
    };
  }, [open, attempt, order.id, order.title, order.amount]);

  /** Ulangi persiapan token setelah gagal (mis. jaringan / env bermasalah). */
  function handleRetry(): void {
    setPhase("loading");
    setError(null);
    setAttempt((value) => value + 1);
  }

  /** Tutup modal + revalidasi rute agar status pesanan terbaru tampil. */
  function finishPayment(): void {
    onClose();
    router.refresh();
  }

  /** Abaikan penutupan backdrop selagi jendela Snap masih terbuka. */
  function requestClose(): void {
    if (isPaying) {
      return;
    }
    onClose();
  }

  /** Buka jendela pembayaran Snap dengan token dari Server Action. */
  function handlePay(): void {
    const snap = window.snap;
    if (phase !== "ready" || !snapToken || !snap) {
      toast.error("Pembayaran belum siap. Muat ulang halaman lalu coba lagi.");
      return;
    }

    setIsPaying(true);
    snap.pay(snapToken, {
      onSuccess: (result) => {
        setIsPaying(false);
        toast.success(
          `Pembayaran berhasil lewat ${result.payment_type}! Pesananmu segera diproses. 🎉`,
        );
        finishPayment();
      },
      onPending: () => {
        setIsPaying(false);
        toast.info(
          "Pembayaran sedang diproses. Status pesanan diperbarui otomatis.",
        );
        finishPayment();
      },
      onError: (result) => {
        setIsPaying(false);
        toast.error(
          result.status_message || "Pembayaran gagal. Silakan coba lagi.",
        );
      },
      onClose: () => {
        setIsPaying(false);
        toast.info(
          "Jendela pembayaran ditutup. Pesanan tetap menunggu pembayaran.",
        );
      },
    });
  }

  return (
    <Modal open={open} title="Checkout Pembayaran" onClose={requestClose}>
      <div className="space-y-4">
        {/* Keamanan Midtrans + daftar metode yang tersedia di Snap. */}
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-indigo-100 bg-gradient-to-b from-indigo-50/80 to-white p-5">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
            <ShieldCheck className="h-7 w-7" />
          </span>
          <div className="text-center">
            <p className="text-sm font-semibold text-zinc-900">
              Bayar aman lewat Midtrans Snap
            </p>
            <p className="text-[0.7rem] text-zinc-500">
              Terenkripsi & status pesanan diperbarui otomatis.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {PAYMENT_METHODS.map((method) => (
              <span
                key={method.label}
                className="inline-flex items-center gap-1 rounded-full border border-indigo-100 bg-white px-2.5 py-1 text-[0.65rem] font-semibold text-indigo-600"
              >
                <method.icon className="h-3 w-3" />
                {method.label}
              </span>
            ))}
          </div>
        </div>

        {/* Ringkasan pesanan — data lokal sehingga selalu tampil langsung. */}
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

        {phase === "error" && error ? (
          <p className="rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-3 text-xs font-medium text-rose-600">
            {error}
          </p>
        ) : null}

        {/* Aksi utama: satu tombol yang memicu window.snap.pay(token). */}
        {phase === "ready" ? (
          <button
            type="button"
            onClick={handlePay}
            disabled={isPaying}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CreditCard className="h-4 w-4" />
            <span>{isPaying ? "Memproses..." : "Bayar Sekarang"}</span>
          </button>
        ) : null}

        {phase === "loading" ? (
          <div
            aria-live="polite"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 opacity-70"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Menyiapkan pembayaran...</span>
          </div>
        ) : null}

        {phase === "error" ? (
          <button
            type="button"
            onClick={handleRetry}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3.5 text-sm font-semibold text-indigo-600 transition-all duration-200 active:scale-95"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Coba Lagi</span>
          </button>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 py-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
            <span className="text-[0.7rem] leading-tight font-semibold text-emerald-700">
              Aman & Terenkripsi
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-3 py-2">
            <Timer className="h-4 w-4 shrink-0 text-indigo-600" />
            <span className="text-[0.7rem] leading-tight font-semibold text-indigo-700">
              Status Otomatis
            </span>
          </div>
        </div>

        <p className="text-[0.7rem] leading-relaxed text-zinc-400">
          Tekan{" "}
          <span className="font-semibold text-zinc-600">Bayar Sekarang</span>{" "}
          lalu pilih metode (QRIS, Virtual Account, e-wallet, atau kartu). Tidak
          perlu unggah bukti — status pesanan diperbarui otomatis setelah
          pembayaran.
        </p>

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
