"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Loader2, MapPin, Radio } from "lucide-react";
import type { OrderService } from "@/features/orders/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { CAMPUS_COORDS } from "@/lib/weather";
import { trackingRealtimeFilter, type OrderTracking } from "../types";

/**
 * Leaflet menyentuh `window` saat mount, sehingga wajib dimuat secara dinamis
 * dengan `ssr: false`. Pemanggilan ini berada di dalam Client Component —
 * sesuai aturan arsitektur (dilarang di Server Component).
 */
const TrackingMap = dynamic(() => import("./TrackingMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
      <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
    </div>
  ),
});

interface TrackingRow {
  order_id: string;
  service: string;
  lat: number;
  lng: number;
  note: string | null;
  updated_at: string;
}

function toTracking(row: TrackingRow, service: OrderService): OrderTracking {
  return {
    orderId: row.order_id,
    service,
    lat: row.lat,
    lng: row.lng,
    note: row.note,
    updatedAt: row.updated_at,
  };
}

interface OrderTrackingCardProps {
  orderId: string;
  service: OrderService;
}

/**
 * Kartu live tracking: memuat posisi awal lalu berlangganan kanal Realtime
 * Supabase (`postgres_changes` pada `order_trackings`) untuk pergerakan
 * kurir/operator secara langsung.
 */
export function OrderTrackingCard({
  orderId,
  service,
}: OrderTrackingCardProps) {
  const [tracking, setTracking] = useState<OrderTracking | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let active = true;

    async function loadInitial(): Promise<void> {
      const { data, error } = await supabase
        .from("order_trackings")
        .select("order_id, service, lat, lng, note, updated_at")
        .eq("order_id", orderId)
        .maybeSingle();

      if (active && !error && data) {
        setTracking(toTracking(data as TrackingRow, service));
      }
      if (active) {
        setIsLoading(false);
      }
    }

    void loadInitial();

    const channel = supabase
      .channel(`order-tracking:${service}:${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_trackings",
          filter: trackingRealtimeFilter(orderId),
        },
        (payload: { new: Partial<TrackingRow> }) => {
          const row = payload.new;

          // Realtime mengirim `{}` untuk event DELETE — abaikan baris tak lengkap.
          if (
            !row ||
            row.service !== service ||
            row.order_id !== orderId ||
            typeof row.lat !== "number" ||
            typeof row.lng !== "number"
          ) {
            return;
          }

          setTracking({
            orderId: row.order_id,
            service,
            lat: row.lat,
            lng: row.lng,
            note: row.note ?? null,
            updatedAt: row.updated_at ?? new Date().toISOString(),
          });
          setIsLoading(false);
        },
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [orderId, service]);

  const hasPosition = tracking !== null;

  return (
    <article className="rounded-3xl border border-white/20 bg-white/70 p-5 shadow-sm backdrop-blur-md">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
            <MapPin className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">
              Lacak Kurir Langsung
            </h3>
            <p className="text-[0.7rem] text-zinc-500">
              Posisi diperbarui real-time selama pesanan diantar.
            </p>
          </div>
        </div>

        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[0.6rem] font-semibold text-sky-700">
          <Radio className="h-3 w-3 animate-pulse" />
          LIVE
        </span>
      </div>

      {isLoading ? (
        <div className="flex h-64 w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : hasPosition ? (
        <TrackingMap tracking={tracking} />
      ) : (
        <div className="flex h-64 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center">
          <MapPin className="h-5 w-5 text-slate-400" />
          <p className="text-xs font-semibold text-slate-600">
            Menunggu posisi kurir
          </p>
          <p className="text-[0.7rem] text-slate-400">
            Peta akan muncul otomatis begitu kurir membagikan lokasinya.
          </p>
        </div>
      )}

      <p className="mt-3 text-[0.65rem] text-zinc-400">
        {tracking ? (
          <>
            Terakhir diperbarui {new Date(tracking.updatedAt).toLocaleString("id-ID")}
            {tracking.note ? ` · ${tracking.note}` : ""}
          </>
        ) : (
          `Titik awal area kampus ${CAMPUS_COORDS.lat.toFixed(4)}, ${CAMPUS_COORDS.lng.toFixed(4)}`
        )}
      </p>
    </article>
  );
}
