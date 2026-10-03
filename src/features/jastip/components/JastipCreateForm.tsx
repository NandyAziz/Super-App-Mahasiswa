"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import {
  Info,
  Loader2,
  MapPin,
  PackagePlus,
  Phone,
  Ruler,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/format";
import { TextareaField } from "@/components/ui/TextareaField";
import { TextField } from "@/components/ui/TextField";
import {
  JASTIP_BASE_DISTANCE_KM,
  JASTIP_EXTRA_PER_KM,
  JASTIP_MAX_DISTANCE_KM,
  JASTIP_OUT_OF_RANGE_MESSAGE,
  JastipOutOfRangeError,
  calculateJastipShippingFee,
  type JastipShippingBreakdown,
} from "@/lib/pricing";
import { createJastipOrderAction } from "../actions";
import type { JastipActionResult, JastipOrder } from "../types";

interface JastipCreateFormProps {
  /** Dipanggil setelah titipan dibuat; membawa baris yang baru dibuat. */
  onSuccess?: (order: JastipOrder) => void;
}

/** Jarak awal (KM) agar ongkir dasar langsung terlihat. */
const DEFAULT_DISTANCE = JASTIP_BASE_DISTANCE_KM;

const WHATSAPP_HINT =
  "Wajib diisi untuk konfirmasi pesanan & koordinasi driver";

const RADIUS_NOTICE = `Ongkir otomatis: Rp5.000 (0–2 KM), +Rp2.000/km, maksimal ${JASTIP_MAX_DISTANCE_KM} KM. Jam sibuk (11:00–13:00 & 16:00–18:00) +20%.`;

type FeeState =
  | { status: "ok"; breakdown: JastipShippingBreakdown }
  | { status: "out_of_range" }
  | { status: "idle" };

/** Header bento dengan maskot Jastip sebagai ilustrasi hero. */
function JastipHero() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-linear-to-br from-indigo-50 to-white p-3.5">
      <Image
        src="/images/mascot/bear-jastip.png"
        alt="Maskot Jastip Cepat"
        width={96}
        height={96}
        priority
        className="h-16 w-16 shrink-0 object-contain drop-shadow-md"
      />
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-slate-900">Jastip Cepat</h3>
        <p className="text-xs text-slate-500">
          Tulis barang atau makanan yang mau dititip, kurir kampus yang urus.
        </p>
      </div>
    </div>
  );
}

/** Kartu rincian ongkir (base + ekstra + jam sibuk). */
function FeeBreakdown({ breakdown }: { breakdown: JastipShippingBreakdown }) {
  return (
    <div className="space-y-1.5 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>Tarif dasar (0–{JASTIP_BASE_DISTANCE_KM} KM)</span>
        <span>{formatRupiah(breakdown.baseFee)}</span>
      </div>

      {breakdown.extraKm > 0 ? (
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>
            Tambahan {breakdown.extraKm} KM × {formatRupiah(JASTIP_EXTRA_PER_KM)}
          </span>
          <span>{formatRupiah(breakdown.extraFee)}</span>
        </div>
      ) : null}

      {breakdown.isPeakHour ? (
        <div className="flex items-center justify-between text-xs font-medium text-amber-600">
          <span>Jam sibuk (+20%)</span>
          <span>×{breakdown.peakMultiplier}</span>
        </div>
      ) : null}

      <div className="mt-1 flex items-center justify-between border-t border-indigo-100 pt-2 text-sm font-bold text-slate-900">
        <span>Total Ongkir</span>
        <span>{formatRupiah(breakdown.total)}</span>
      </div>
    </div>
  );
}

export function JastipCreateForm({ onSuccess }: JastipCreateFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [distance, setDistance] = useState(String(DEFAULT_DISTANCE));

  // Pratinjau ongkir real-time. Form hanya dirender di client (di dalam Modal
  // yang baru mount saat dibuka), sehingga `new Date()` aman dari mismatch.
  const feeState = useMemo<FeeState>(() => {
    const value = Number(distance);
    if (!Number.isFinite(value) || value <= 0) {
      return { status: "idle" };
    }

    try {
      return {
        status: "ok",
        breakdown: calculateJastipShippingFee({ distanceKm: value }),
      };
    } catch (cause) {
      if (cause instanceof JastipOutOfRangeError) {
        return { status: "out_of_range" };
      }
      throw cause;
    }
  }, [distance]);

  function resetForm(form: HTMLFormElement): void {
    form.reset();
    setDistance(String(DEFAULT_DISTANCE));
    setFieldErrors({});
  }

  function applyResult(result: JastipActionResult, form: HTMLFormElement): void {
    if (result.status === "error") {
      setFieldErrors(result.fieldErrors ?? {});
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
    resetForm(form);
    if (result.order) {
      onSuccess?.(result.order);
    }
    router.refresh();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      applyResult(await createJastipOrderAction(formData), form);
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <JastipHero />

      <section className="space-y-4">
        <TextField
          id="whatsapp"
          name="whatsapp"
          type="tel"
          inputMode="tel"
          label="Nomor WhatsApp Aktif"
          placeholder="08123456789"
          icon={Phone}
          hint={WHATSAPP_HINT}
          error={fieldErrors.whatsapp}
          disabled={isPending}
          required
        />

        <TextareaField
          id="item_name"
          name="item_name"
          label="Barang / Makanan yang Dititip"
          placeholder="Tulis barang/makanan yang mau dititip"
          icon={ShoppingBag}
          rows={3}
          error={fieldErrors.item_name}
          disabled={isPending}
          required
        />

        <TextareaField
          id="dropoff_location"
          name="dropoff_location"
          label="Lokasi Antar (isi bebas)"
          placeholder="Contoh: Gedung C Lt 2 depan R. 204 atau Kost Orange Gang 3"
          icon={MapPin}
          rows={2}
          hint="Tulis detail lokasi persisnya agar kurir tidak tersesat"
          error={fieldErrors.dropoff_location}
          disabled={isPending}
          required
        />
      </section>

      <section className="space-y-4">
        <TextField
          id="distance_km"
          name="distance_km"
          type="number"
          inputMode="decimal"
          min={1}
          max={JASTIP_MAX_DISTANCE_KM}
          step={0.1}
          label="Jarak Antar (KM)"
          icon={Ruler}
          value={distance}
          onChange={(event) => setDistance(event.target.value)}
          hint={`Maksimal ${JASTIP_MAX_DISTANCE_KM} KM dari area kampus`}
          error={fieldErrors.distance_km}
          disabled={isPending}
          required
        />

        {feeState.status === "ok" ? (
          <FeeBreakdown breakdown={feeState.breakdown} />
        ) : feeState.status === "out_of_range" ? (
          <p className="flex items-start gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-600">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{JASTIP_OUT_OF_RANGE_MESSAGE}</span>
          </p>
        ) : null}
      </section>

      <p className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[0.7rem] leading-relaxed font-medium text-amber-700">
        <Wallet className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{RADIUS_NOTICE}</span>
      </p>

      <button
        type="submit"
        disabled={isPending || feeState.status === "out_of_range"}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <PackagePlus className="h-4 w-4" />
        )}
        <span>{isPending ? "Mengirim..." : "Buat Titipan"}</span>
      </button>
    </form>
  );
}

