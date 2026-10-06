"use client";

import { CloudRain, Loader2 } from "lucide-react";
import type { WeatherSurge } from "@/lib/weather";

interface WeatherSurgeNoticeProps {
  surge: WeatherSurge | null;
}

/**
 * Indikator surge ongkir cuaca. Tidak dirender sama sekali saat cuaca normal
 * sehingga tidak menambah bising visual, dan menampilkan skeleton singkat
 * selagi cuaca dimuat.
 */
export function WeatherSurgeNotice({ surge }: WeatherSurgeNoticeProps) {
  if (surge === null) {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[0.7rem] font-medium text-slate-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Mengecek cuaca area kampus…
      </p>
    );
  }

  if (!surge.isSurging) {
    return null;
  }

  return (
    <p className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-[0.7rem] leading-relaxed font-medium text-sky-700">
      <CloudRain className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        <strong className="font-semibold">Surge cuaca aktif</strong> —{" "}
        {surge.reason}. Tarif berlaku otomatis untuk pesanan hari ini.
      </span>
    </p>
  );
}
