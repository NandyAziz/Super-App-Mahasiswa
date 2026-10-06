"use client";

import { useEffect, useState } from "react";
import {
  fetchWeatherSurge,
  NO_WEATHER_SURGE,
  type WeatherSurge,
} from "@/lib/weather";

/**
 * Ambil surge ongkir cuaca terkini (Open-Meteo) sekali per mount.
 *
 * Mengembalikan `null` selagi memuat sehingga UI tidak berkedip ke status
 * "normal" sebelum jawaban datang. Gagal/timeout → `NO_WEATHER_SURGE`
 * (tanpa surge), sehingga perhitungan ongkir tidak pernah gagal karena cuaca.
 */
export function useWeatherSurge(): WeatherSurge | null {
  const [surge, setSurge] = useState<WeatherSurge | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void fetchWeatherSurge(controller.signal).then((result) => {
      if (!controller.signal.aborted) {
        setSurge(result);
      }
    });

    return () => controller.abort();
  }, []);

  return surge;
}

/** Nilai ongkir aman dipakai saat masih memuat / gagal. */
export function resolveSurgeValue(surge: WeatherSurge | null): number {
  return surge ? surge.surge : 0;
}

export { NO_WEATHER_SURGE };
