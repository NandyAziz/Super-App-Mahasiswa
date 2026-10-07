"use client";

import { useEffect, useState } from "react";
import { fetchCampusWeather, toWeatherBadgeData, type WeatherBadgeData } from "@/lib/weather";

interface WeatherBadgeProps {
  /** Data awal dari server agar badge langsung tampil tanpa berkedip. */
  initial?: WeatherBadgeData | null;
}

/**
 * Weather badge kampus 2.0: fixed-height pill dengan ikon + status + suhu.
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
      <span
        role="status"
        aria-label="Cuaca kampus: Cerah, 20°C"
        className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/80 px-2.5 py-1 text-[0.7rem] font-medium text-slate-600 backdrop-blur-md"
      >
        <span aria-hidden="true">☀️</span>
        Cerah
        <span aria-hidden="true">•</span>
        <span>20°C</span>
      </span>
    );
  }

  const temperatureLabel =
    weather.temperature === null ? null : `${weather.temperature}°C`;

  return (
    <span
      role="status"
      aria-label={`Cuaca kampus: ${weather.condition}${temperatureLabel ? `, ${temperatureLabel}` : ""}`}
      className="flex items-center gap-1.5 rounded-full bg-slate-100/90 px-2.5 py-1 text-xs font-medium text-slate-700"
    >
      <span aria-hidden="true">{weather.icon}</span>
      <span>{weather.condition}</span>
      {temperatureLabel ? (
        <>
          <span aria-hidden="true">•</span>
          <span>{temperatureLabel}</span>
        </>
      ) : null}
    </span>
  );
}
