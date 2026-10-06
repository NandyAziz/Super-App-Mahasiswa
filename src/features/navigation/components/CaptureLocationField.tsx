"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, LocateFixed, MapPin, X } from "lucide-react";
import type { DestinationCoords } from "@/features/orders/coordinates";

interface CaptureLocationFieldProps {
  lat: DestinationCoords["lat"] | null;
  lng: DestinationCoords["lng"] | null;
  onChange: (coords: DestinationCoords | null) => void;
  /**
   * Ambil lokasi otomatis di latar belakang saat komponen dimuat, tanpa
   * menunggu pelanggan menekan tombol. Defaults to `false`.
   *
   * Penolakan izin lokasi TIDAK menjadi error: koordinat dibiarkan `null`
   * dan pelanggan tetap bisa menekan tombol manual bila berubah pikiran.
   */
  autoCaptureOnMount?: boolean;
}

/** Opsi untuk lokasi yang cukup presisi tanpa boros daya. */
const AUTO_CAPTURE_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 60_000,
};

/**
 * Kolom koordinat tujuan tersembunyi untuk form.
 *
 * Pemesan dapat opsional menandai titik GPS-nya agar operator punya peta
 * navigasi di `/admin`. Field ini OPSIONAL: form tetap valid tanpa lokasi
 * (koordinat disimpan `NULL`), sehingga tidak pernah menghalangi pembuatan
 * pesanan bagi pengguna yang menolak atau tidak mendukung geolokasi.
 */
export function CaptureLocationField({
  lat,
  lng,
  onChange,
  autoCaptureOnMount = false,
}: CaptureLocationFieldProps) {
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Ref (bukan state) sehingga penanda "sudah mencoba" tidak memicu render
  // dan tidak ikut menarik ulang effect.
  const autoAttemptedRef = useRef(false);

  /**
   * Auto-capture saat mount. Dijalankan SATU kali saja: `setState` hanya
   * dipanggil di dalam callback `getCurrentPosition` (asinkron), sehingga
   * aman terhadap aturan React "no setState sinkron di dalam effect".
   */
  useEffect(() => {
    if (!autoCaptureOnMount || autoAttemptedRef.current) {
      return;
    }
    if (lat !== null && lng !== null) {
      return;
    }
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      return;
    }

    autoAttemptedRef.current = true;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        // Diabaikan diam-diam: lokasi tetap `null`, tombol manual tetap
        // tersedia, dan pesan error sengaja tidak ditampilkan otomatis agar
        // tidak mengganggu saat form baru dibuka.
      },
      AUTO_CAPTURE_OPTIONS,
    );
  }, [autoCaptureOnMount, lat, lng, onChange]);

  function capture(): void {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setError("Perangkat ini tidak mendukung GPS.");
      return;
    }

    setError(null);
    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        onChange({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        setIsLocating(false);
        setError("Tidak dapat mengakses lokasi. Izinkan akses GPS.");
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  }

  const hasCoords = lat !== null && lng !== null;

  return (
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-3">
      {/* Input tersembunyi: nilai tetap ikut terkirim ke Server Action. */}
      <input type="hidden" name="destination_lat" value={lat ?? ""} />
      <input type="hidden" name="destination_lng" value={lng ?? ""} />

      <div className="flex items-start gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
          <MapPin className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[0.7rem] font-semibold text-zinc-800">
            Titik antar (opsional)
          </p>
          <p className="mt-0.5 text-[0.65rem] leading-relaxed text-zinc-500">
            {hasCoords
              ? `Tersimpan: ${lat.toFixed(5)}, ${lng.toFixed(5)}`
              : "Bagikan lokasi agar Tim Campify bisa mengantar tepat ke tempatmu."}
          </p>

          {error ? (
            <p className="mt-1 text-[0.65rem] font-medium text-rose-600">{error}</p>
          ) : null}

          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={capture}
              disabled={isLocating}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-500 px-3 py-1.5 text-[0.65rem] font-semibold text-white transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLocating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <LocateFixed className="h-3.5 w-3.5" />
              )}
              <span>{hasCoords ? "Perbarui" : "Bagikan Lokasi"}</span>
            </button>

            {hasCoords ? (
              <button
                type="button"
                onClick={() => onChange(null)}
                aria-label="Hapus titik antar"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-indigo-500 transition-all duration-200 active:scale-95"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}