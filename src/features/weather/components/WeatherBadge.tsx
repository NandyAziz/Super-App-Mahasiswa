"use client";

import { useEffect, useState } from "react";
import { fetchCampusWeather, toWeatherBadgeData, type WeatherBadgeData } from "@/lib/weather";

interface WeatherBadgeProps {
  /** Data awal dari server agar badge langsung tampil tanpa berkedip. */
  initial?: WeatherBadgeData | null;
}

/**
 * Badge cuaca kampus 2.0: pill `rounded-2xl` dengan ikon + label Indonesia.
 *
 * Contoh tampil: `🌦️ Hujan Ringan • 24°C`. Data awal diisi server
 * (`fetchWeatherBadge`), lalu disegarkan sekali di client agar suhu tetap
 * hidup tanpa memblokir render.
 */
export function WeatherBadge({ initial = null }: WeatherBadgeProps) {
  const [weather, setWeather] = useState<WeatherBadgeData | null>(initial);

  useEffect(() => {
    const controller = new AbortController();
    void fetchCampusWeather(controller.signal).then((result) => {
      if (!controller.signal.aborted) {
        setWeather((previous) => toWeatherBadgeData(result) ?? previous);
      }
    });
    return () => controller.abort();
  }, []);

  if (!weather) {
    return (
      <span className="inline-flex animate-pulse items-center gap-1.5 rounded-2xl border border-white/20 bg-white/70 px-3 py-1.5 text-[0.7rem] font-medium text-zinc-400 backdrop-blur-md">
        Memuat cuaca…
      </span>
    );
  }

  const temperatureLabel =
    weather.temperature === null ? null : `${weather.temperature}°C`;

  return (
    <span
      role="status"
      aria-label={`Cuaca kampus: ${weather.condition}${temperatureLabel ? `, ${temperatureLabel}` : ""}`}
      className="inline-flex items-center gap-1.5 rounded-2xl border border-sky-100 bg-sky-50/80 px-3 py-1.5 text-[0.7rem] font-semibold text-sky-700 backdrop-blur-md"
    >
      <span aria-hidden="true">{weather.icon}</span>
      <span>{weather.condition}</span>
      {temperatureLabel ? <span>• {temperatureLabel}</span> : null}
    </span>
  );
}
