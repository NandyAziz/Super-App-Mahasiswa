"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import {
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
  Route as RouteIcon,
} from "lucide-react";
import type { OrderService } from "@/features/orders/types";
import {
  buildGoogleMapsNavigationUrl,
  NO_DESTINATION_MESSAGE,
  type DestinationCoords,
} from "@/features/orders/coordinates";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { fetchOsrmRoute, formatDistanceKm, formatDuration, type RouteInfo } from "../route";

/**
 * Leaflet menyentuh `window` saat mount, sehingga WAJIB dimuat dinamis dengan
 * `ssr: false`. Pemanggilan ini berada di dalam Client Component — sesuai aturan
 * arsitektur proyek (dilarang di Server Component).
 */
const RouteMap = dynamic(() => import("./RouteMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
      <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
    </div>
  ),
});

interface DriverNavigationCardProps {
  orderId: string;
  service: OrderService;
  /** Koordinat tujuan; `null` bila pemesan belum mengirim lokasi. */
  destination: DestinationCoords | null;
}

/** Perbandingan koordinat dengan toleransi agar rute tidak dihitung ulang
 *  hanya karena perbedaan float yang sangat kecil. */
function isSamePoint(a: DestinationCoords, b: DestinationCoords): boolean {
  return Math.abs(a.lat - b.lat) < 1e-6 && Math.abs(a.lng - b.lng) < 1e-6;
}

/**
 * Panel navigasi driver di `/admin`: posisi mitra, lokasi tujuan, rute biru via
 * OSRM, estimasi jarak/waktu, dan tombol buka Google Maps.
 *
 * Bila posisi mitra belum dibagikan, koordinat kampus dipakai sebagai titik
 * awal agar peta tetap informatif.
 */
export function DriverNavigationCard({
  orderId,
  service,
  destination,
}: DriverNavigationCardProps) {
  const [driver, setDriver] = useState<DestinationCoords | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // TIDAK ada fallback ke koordinat kampus: bila lokasi presisi tidak tersimpan,
  // `target` tetap `null` dan UI menyatakannya secara terbuka.
  const target = destination;

  // Ambil posisi mitra terakhir dari `order_trackings`.
  useEffect(() => {
    let active = true;
    const supabase = createSupabaseBrowserClient();

    async function loadDriver(): Promise<void> {
      const { data } = await supabase
        .from("order_trackings")
        .select("lat, lng")
        .eq("order_id", orderId)
        .eq("service", service)
        .maybeSingle();

      if (active) {
        setDriver(data ? { lat: data.lat, lng: data.lng } : null);
        setIsLoading(false);
      }
    }

    void loadDriver();
    return () => {
      active = false;
    };
  }, [orderId, service]);

  // Rute tersimpan BERSAMA titik mitra yang dihitungnya, sehingga bisa
  // diturunkan saat render. Dengan begitu effect tidak perlu pernah
  // memanggil setState secara sinkron (menbolo cascading render), dan rute
  // lama otomatis diabaikan begitu posisi mitra berpindah.
  const [routeFor, setRouteFor] = useState<{
    from: DestinationCoords;
    info: RouteInfo;
  } | null>(null);
  // True setelah OSRM pertama kali merespons (berhasil maupun gagal), sehingga
  // "menghitung rute" hanya tampil untuk pemuatan pertama.
  const [hasComputedRoute, setHasComputedRoute] = useState(false);

  const activeRoute =
    driver !== null && routeFor !== null && isSamePoint(routeFor.from, driver)
      ? routeFor.info
      : null;
  const routePoints = activeRoute?.points ?? null;
  const distanceKm = activeRoute ? formatDistanceKm(activeRoute.distanceMeters) : null;
  const durationLabel = activeRoute
    ? formatDuration(activeRoute.durationSeconds)
    : null;
  const isRouting = driver !== null && target !== null && !hasComputedRoute;

  // Rute hanya dihitung bila koordinat tujuan benar-benar ada.
  useEffect(() => {
    if (driver === null || target === null) {
      return;
    }

    const to: DestinationCoords = target;
    // Salin ke konstanta bertipe eksplisit: narrowing `driver` dari state tidak
    // ikut terbawa ke dalam closure async.
    const from: DestinationCoords = driver;
    let active = true;

    async function loadRoute(): Promise<void> {
      const info = await fetchOsrmRoute(from, to);

      if (!active) {
        return;
      }

      // OSRM gagal/timeout/disconnect → `null`, peta tetap menampilkan garis
      // lurus antara kedua marker.
      setHasComputedRoute(true);
      setRouteFor(info ? { from, info } : null);
    }

    void loadRoute();
    return () => {
      active = false;
    };
  }, [driver, target]);
return (
    <div className="mt-2 overflow-hidden rounded-2xl border border-blue-100 bg-blue-50/40">
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
          <RouteIcon className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.7rem] font-semibold text-zinc-800">
            Navigasi ke Pelanggan
          </span>
          <span className="block truncate text-[0.65rem] text-zinc-400">
            {driver ? "Rute mitra → lokasi tujuan" : "Posisi mitra belum dibagikan"}
          </span>
        </span>
      </div>

      <div className="px-2 pb-2">
        {isLoading ? (
          <div className="flex h-72 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            {/* Tanpa koordinat tujuan: peta TIDAK dirender sama sekali agar
                tidak ada titik imajiner yang disalahpahami driver. */}
            {target === null ? (
              <p className="flex items-start gap-2 rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2.5 text-[0.7rem] leading-relaxed font-medium text-amber-700">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{NO_DESTINATION_MESSAGE}</span>
              </p>
            ) : driver === null ? (
              <p className="flex items-start gap-2 rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2.5 text-[0.7rem] leading-relaxed font-medium text-amber-700">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Posisi mitra belum dibagikan. Minta kurir menekan
                  &quot;Bagikan Lokasi&quot; untuk menampilkan peta rute.
                </span>
              </p>
            ) : (
              <>
                {/* Ringkasan rute di ATAS peta agar driver langsung melihat
                    estimasi jarak/waktu tanpa menggulir ke bawah. */}
                {isRouting ? (
                  <p className="mb-2 flex items-center gap-1.5 text-[0.7rem] font-medium text-blue-600">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Menghitung rute…</span>
                  </p>
                ) : distanceKm && durationLabel ? (
                  <div className="mb-2 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-white px-2.5 py-1 text-[0.65rem] font-semibold text-blue-700">
                      <RouteIcon className="h-3 w-3" />
                      <span>{distanceKm}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-white px-2.5 py-1 text-[0.65rem] font-semibold text-blue-700">
                      <Clock className="h-3 w-3" />
                      <span>{durationLabel}</span>
                    </span>
                  </div>
                ) : (
                  <p className="mb-2 text-[0.65rem] text-zinc-400">
                    Estimasi rute tidak tersedia (peta menampilkan garis lurus).
                  </p>
                )}

                <RouteMap driver={driver} destination={target} route={routePoints} />

                <a
                  href={buildGoogleMapsNavigationUrl(target)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-[0.7rem] font-semibold text-white shadow-sm transition-all duration-200 active:scale-95"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  <span>Buka di Google Maps</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}