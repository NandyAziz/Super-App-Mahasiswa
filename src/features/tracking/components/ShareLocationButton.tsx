"use client";

import { useState, useTransition } from "react";
import { Loader2, Navigation } from "lucide-react";
import { toast } from "sonner";
import type { OrderService } from "@/features/orders/types";
import { upsertOrderTrackingAction } from "../actions";

interface ShareLocationButtonProps {
  service: OrderService;
  orderId: string;
}

/**
 * Tombol operator: bagikan posisi GPS perangkat ini sebagai posisi kurir.
 * Baris `order_trackings` di-upsert, sehingga seluruh pihak pada pesanan
 * menerima pembaruan lewat kanal Realtime.
 */
export function ShareLocationButton({
  service,
  orderId,
}: ShareLocationButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [isLocating, setIsLocating] = useState(false);
  const isBusy = isPending || isLocating;

  function shareLocation(): void {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      toast.error("Perangkat ini tidak mendukung GPS.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        startTransition(async () => {
          const result = await upsertOrderTrackingAction({
            service,
            orderId,
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            note: "Posisi kurir dibagikan",
          });

          if (result.status === "error") {
            toast.error(result.message);
            return;
          }
          toast.success(result.message);
        });
      },
      () => {
        setIsLocating(false);
        toast.error("Tidak dapat mengakses lokasi. Izinkan akses GPS.");
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  }

  return (
    <button
      type="button"
      onClick={shareLocation}
      disabled={isBusy}
      className="flex items-center justify-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-[0.7rem] font-semibold text-sky-600 transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isBusy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Navigation className="h-3.5 w-3.5" />
      )}
      <span>Bagikan Lokasi</span>
    </button>
  );
}
