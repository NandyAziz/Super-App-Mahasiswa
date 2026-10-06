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
import { startSnapPayment } from "@/features/payment/start-snap-payment";
import { PromoBadge } from "@/features/promos/components/PromoBadge";
import { FreeShippingBadge } from "@/features/orders/components/FreeShippingBadge";
import { applyFreeShipping, type FreeShippingStatus } from "@/features/orders/free-shipping";
import { resolveJastipFeeTotal } from "@/features/promos/catalog";
import type { AppliedPromo } from "@/features/promos/catalog";
import type { JastipActionResult, JastipOrder } from "../types";
import { WeatherSurgeNotice } from "@/features/weather/components/WeatherSurgeNotice";
import { CaptureLocationField } from "@/features/navigation/components/CaptureLocationField";
import { requestCurrentPosition } from "@/features/navigation/geolocation";
import type { DestinationCoords } from "@/features/orders/coordinates";
import {
  resolveSurgeValue,
  useWeatherSurge,
} from "@/features/weather/use-weather-surge";

interface JastipCreateFormProps {
  /** Dipanggil setelah titipan dibuat; membawa baris yang baru dibuat. */
  onSuccess?: (order: JastipOrder) => void;
  /**
   * Promo yang sudah diverifikasi server (hasil parsing `?promo=` di halaman).
   * Hanya KODE-nya yang dikirim — Server Action memverifikasi ulang.
   */
  appliedPromo?: AppliedPromo | null;
  /** Status bebas ongkir otomatis; null bila belum terhitung. */
  freeShipping?: FreeShippingStatus | null;
}

/** Jarak awal (KM) agar ongkir dasar langsung terlihat. */
const DEFAULT_DISTANCE = JASTIP_BASE_DISTANCE_KM;

const WHATSAPP_HINT =
  "Wajib diisi untuk konfirmasi pesanan & koordinasi driver";

const RADIUS_NOTICE = `Ongkir otomatis: Rp5.000 (0–2 KM), +Rp2.000/km, maksimal ${JASTIP_MAX_DISTANCE_KM} KM. Jam sibuk (11:00–13:00 & 16:00–18:00) +20%.`;

type FeeState =
  | { status: "ok"; breakdown: JastipShippingBreakdown; saved: number }
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

      {breakdown.isWeatherSurge ? (
        <div className="flex items-center justify-between text-xs font-medium text-sky-600">
          <span>Surge cuaca</span>
          <span>+{formatRupiah(breakdown.weatherSurge)}</span>
        </div>
      ) : null}

      <div className="mt-1 flex items-center justify-between border-t border-indigo-100 pt-2 text-sm font-bold text-slate-900">
        <span>Total Ongkir</span>
        <span>{formatRupiah(breakdown.total)}</span>
      </div>
    </div>
  );
}

export function JastipCreateForm({
  onSuccess,
  appliedPromo = null,
  freeShipping = null,
}: JastipCreateFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [distance, setDistance] = useState(String(DEFAULT_DISTANCE));
  // Titik lokasi barang untuk peta navigasi driver di `/admin`. Diisi otomatis
  // oleh GPS perangkat saat form dibuka; tetap opsional bila ditolak.
  const [destination, setDestination] = useState<DestinationCoords | null>(null);

  // Pratinjau ongkir real-time. Form hanya dirender di client (di dalam Modal
  // yang baru mount saat dibuka), sehingga `new Date()` aman dari mismatch.
  // Surge cuaca Open-Meteo ikut diterapkan agar preview = nilai tersimpan.
  const weatherSurge = useWeatherSurge();
  const weatherValue = resolveSurgeValue(weatherSurge);
  const feeState = useMemo<FeeState>(() => {
    const value = Number(distance);
    if (!Number.isFinite(value) || value <= 0) {
      return { status: "idle" };
    }

    try {
      const breakdown = calculateJastipShippingFee({
        distanceKm: value,
        weatherSurge: weatherValue,
      });

      // Promo memakai rumus murni yang PERSIS sama dengan Server Action,
      // jadi total di layar == nominal yang tersimpan. Promo `null` (tidak
      // aktif / tidak eligible) tidak mengubah apa pun.
      const fee = resolveJastipFeeTotal(
        appliedPromo?.code ?? null,
        breakdown.total,
        Boolean(appliedPromo),
      );

      // Bebas ongkir otomatis (tanpa kode) menimpa total promo: subtotal + 0.
      const freeEligible = freeShipping?.eligible ?? false;
      const finalTotal = applyFreeShipping(fee.total, freeEligible);

      return {
        status: "ok",
        breakdown: { ...breakdown, total: finalTotal },
        saved: breakdown.total - finalTotal,
      };
    } catch (cause) {
      if (cause instanceof JastipOutOfRangeError) {
        return { status: "out_of_range" };
      }
      throw cause;
    }
  }, [distance, weatherValue, appliedPromo, freeShipping]);

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

    // Submit → bayar tanpa langkah manual: `createMidtransSnapToken` +
    // `window.snap.pay` dipicu otomatis bila ada tagihan (ongkir > 0).
    // Gratis ongkir = tanpa pembayaran online (tidak ada yang ditagihkan).
    const order = result.order;
    if (order && order.delivery_tip > 0) {
      void startSnapPayment(
        {
          id: order.id,
          title: order.item_name,
          service: "jastip",
          amount: order.delivery_tip,
        },
        { onFinished: () => router.refresh() },
      );
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = event.currentTarget;

    startTransition(async () => {
      // Auto-capture di form mungkin belum selesai saat pelanggan menekan
      // tombol. Ambil sekali lagi di sini bila koordinat belum ada, lalu
      // TULIS EKSPLISIT ke FormData. Ini menutup dua celah sekaligus:
      // izin GPS yang disetujui belakangan, dan koordinat yang belum sempat
      // ter-render ke hidden input.
      const coords = destination ?? (await requestCurrentPosition());
      if (coords) {
        setDestination(coords);
      }

      const formData = new FormData(form);
      // Hidden input sudah terbaca `FormData(form)`, tetapi kita set ulang
      // agar tidak bergantung pada waktu render React.
      formData.set("destination_lat", coords ? String(coords.lat) : "");
      formData.set("destination_lng", coords ? String(coords.lng) : "");
      // Hanya KODE promo yang dikirim. Nominal diskon & kelayakan tetap
      // dihitung ulang di server — client tidak boleh menentukan harga.
      if (appliedPromo) {
        formData.set("promo_code", appliedPromo.code);
      }

      applyResult(await createJastipOrderAction(formData), form);
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <JastipHero />

      {/* Promo tampil hanya bila sudah diverifikasi server. */}
      <PromoBadge
        promo={appliedPromo}
        savedAmount={feeState.status === "ok" && !freeShipping?.eligible ? feeState.saved : 0}
      />
      <FreeShippingBadge
        status={freeShipping}
        savedAmount={feeState.status === "ok" ? feeState.saved : 0}
      />

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

        <CaptureLocationField
          lat={destination?.lat ?? null}
          lng={destination?.lng ?? null}
          onChange={setDestination}
          autoCaptureOnMount
        />

        {feeState.status === "ok" ? (
          <>
            <FeeBreakdown breakdown={feeState.breakdown} />
            <WeatherSurgeNotice surge={weatherSurge} />
          </>
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

