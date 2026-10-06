/**
 * Cuaca & surge ongkir (Open-Meteo).
 *
 * Murni tanpa dependensi eksternal selain `fetch`, sehingga aman dipakai di
 * Server Action (nilai ongkir resmi) maupun Client Component (indikator UI).
 *
 * Open-Meteo tidak memerlukan API key dan memakai koordinat kampus
 * (overridable lewat `NEXT_PUBLIC_CAMPUS_LAT` / `NEXT_PUBLIC_CAMPUS_LNG`).
 *
 * Sumber kode cuaca: WMO Weather interpretation codes
 * https://open-meteo.com/en/docs
 */

/** Koordinat kampus (default: Universitas Teknologi Bandung / UTB, Jl. Soekarno Hatta No. 378). */
export const CAMPUS_COORDS = {
  lat: parseCoord(process.env.NEXT_PUBLIC_CAMPUS_LAT, -6.9452),
  lng: parseCoord(process.env.NEXT_PUBLIC_CAMPUS_LNG, 107.5975),
};


function parseCoord(raw: string | undefined, fallback: number): number {
  const parsed = raw === undefined ? Number.NaN : Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Tambahan ongkir untuk badai petir (kode 95/96/99). */
export const WEATHER_SURGE_THUNDERSTORM = 5_000;
/** Tambahan ongkir untuk hujan lebat (kode 65/67/82). */
export const WEATHER_SURGE_HEAVY_RAIN = 4_000;
/** Tambahan ongkir untuk hujan ringan/sedang. */
export const WEATHER_SURGE_RAIN = 2_000;
/** Tambahan ongkir maksimum (batas atas aman validasi). */
export const WEATHER_SURGE_MAX = WEATHER_SURGE_THUNDERSTORM;

/** Kode WMO yang dianggap badai petir. */
const THUNDERSTORM_CODES: ReadonlySet<number> = new Set([95, 96, 99]);
/** Kode WMO yang dianggap hujan lebat. */
const HEAVY_RAIN_CODES: ReadonlySet<number> = new Set([65, 67, 82]);
/** Kode WMO yang dianggap hujan (drizzle / ringan / sedang / shower). */
const RAIN_CODES: ReadonlySet<number> = new Set([
  51, 53, 55, 56, 57, 61, 63, 66, 80, 85, 86,
]);

export type WeatherSeverity = "none" | "rain" | "heavy-rain" | "thunderstorm";

export interface WeatherSurge {
  /** Kode cuaca WMO (`null` bila cuaca tidak tersedia). */
  code: number | null;
  severity: WeatherSeverity;
  /** Tambahan ongkir dalam Rupiah (0 bila cuaca normal/tidak tersedia). */
  surge: number;
  /** True hanya saat `surge > 0`. */
  isSurging: boolean;
  /** Label singkat untuk indikator UI. */
  label: string;
  /** Alasan yang ditampilkan ke pengguna. */
  reason: string;
}

const NO_SURGE: WeatherSurge = {
  code: null,
  severity: "none",
  surge: 0,
  isSurging: false,
  label: "Cuaca normal",
  reason: "Tidak ada tambahan ongkir cuaca.",
};

/**
 * Petakan kode cuaca WMO ke besaran surge ongkir.
 * Tidak pernah melempar; kode tak dikenal dianggap normal.
 */
export function getWeatherSurge(
  code: number | null | undefined,
): WeatherSurge {
  if (code === null || code === undefined || !Number.isFinite(code)) {
    return NO_SURGE;
  }

  const numericCode = Math.trunc(code);

  if (THUNDERSTORM_CODES.has(numericCode)) {
    return {
      code: numericCode,
      severity: "thunderstorm",
      surge: WEATHER_SURGE_THUNDERSTORM,
      isSurging: true,
      label: "Cuaca buruk",
      reason: "Badai petir — ongkir +Rp5.000",
    };
  }

  if (HEAVY_RAIN_CODES.has(numericCode)) {
    return {
      code: numericCode,
      severity: "heavy-rain",
      surge: WEATHER_SURGE_HEAVY_RAIN,
      isSurging: true,
      label: "Hujan lebat",
      reason: "Hujan lebat — ongkir +Rp4.000",
    };
  }

  if (RAIN_CODES.has(numericCode)) {
    return {
      code: numericCode,
      severity: "rain",
      surge: WEATHER_SURGE_RAIN,
      isSurging: true,
      label: "Hujan",
      reason: "Hujan di area kampus — ongkir +Rp2.000",
    };
  }

  return {
    code: numericCode,
    severity: "none",
    surge: 0,
    isSurging: false,
    label: "Cuaca normal",
    reason: "Tidak ada tambahan ongkir cuaca.",
  };
}

export interface CampusWeather {
  /** Kode cuaca WMO saat ini. */
  code: number;
  temperatureC: number | null;
  windKmh: number | null;
}

/**
 * Status cuaca siap tampil: label Indonesia + suhu + ikon emoji.
 *
 * Bentuk ini yang diminta integrasi badge cuaca — `{ condition, temperature,
 * icon }` — sehingga header/Jastip bisa merender `🌦️ Hujan Ringan • 24°C`
 * tanpa memetakan kode WMO sendiri.
 */
export interface WeatherBadgeData {
  /** Label Indonesia, mis. `Cerah`, `Hujan Ringan`. */
  condition: string;
  /** Suhu Celcius yang sudah dibulatkan, `null` bila tak tersedia. */
  temperature: number | null;
  /** Emoji ikon cuaca untuk badge. */
  icon: string;
}


interface OpenMeteoResponse {
  current?: {
    weather_code?: unknown;
    temperature_2m?: unknown;
    wind_speed_10m?: unknown;
  };
}

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const WEATHER_TIMEOUT_MS = 4_000;

function toFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Ambil cuaca terkini di area kampus. Mengembalikan `null` bila jaringan gagal
 * / timeout / respons tak terduga — pemanggil wajib memperlakukan `null`
 * sebagai "tanpa surge", bukan sebagai error.
 */
export async function fetchCampusWeather(
  signal?: AbortSignal,
): Promise<CampusWeather | null> {
  const url =
    `${OPEN_METEO_URL}?latitude=${CAMPUS_COORDS.lat}` +
    `&longitude=${CAMPUS_COORDS.lng}` +
    "&current=weather_code,temperature_2m,wind_speed_10m";

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), WEATHER_TIMEOUT_MS);
    signal?.addEventListener("abort", () => controller.abort());

    const response = await fetch(url, {
      signal: controller.signal,
      // Cuaca berubah per jam — jangan di-cache lintas request.
      cache: "no-store",
    });
    clearTimeout(timer);

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as OpenMeteoResponse;
    const code = toFiniteNumber(payload.current?.weather_code);
    if (code === null) {
      return null;
    }

    return {
      code,
      temperatureC: toFiniteNumber(payload.current?.temperature_2m),
      windKmh: toFiniteNumber(payload.current?.wind_speed_10m),
    };
  } catch {
    return null;
  }
}

/**
 * Convenience: cuaca + surge dalam satu panggilan.
 * Gagal → tanpa surge (ongkir tidak pernah gagal karena cuaca).
 */
export async function fetchWeatherSurge(
  signal?: AbortSignal,
): Promise<WeatherSurge> {
  const weather = await fetchCampusWeather(signal);
  return weather ? getWeatherSurge(weather.code) : NO_SURGE;
}

/** Surge tanpa cuaca — dipakai saat fetch tidak memungkinkan. */
export const NO_WEATHER_SURGE: WeatherSurge = NO_SURGE;

/** Fallback badge saat cuaca tak tersedia (tetap konsisten di UI). */
export const FALLBACK_WEATHER_BADGE: WeatherBadgeData = {
  condition: "Cerah",
  temperature: null,
  icon: "☀️",
};

/**
 * Petakan kode WMO ke label Indonesia + emoji (sumber: WMO interpretation
 * codes https://open-meteo.com/en/docs). Tidak pernah melempar; kode tak
 * dikenal dianggap `Berawan`.
 */
export function describeWeatherCode(code: number | null | undefined): {
  condition: string;
  icon: string;
} {
  if (code === null || code === undefined || !Number.isFinite(code)) {
    return { condition: FALLBACK_WEATHER_BADGE.condition, icon: "☀️" };
  }

  const numericCode = Math.trunc(code);

  if (numericCode === 0) {
    return { condition: "Cerah", icon: "☀️" };
  }
  if (numericCode <= 3) {
    return { condition: "Berawan", icon: "☁️" };
  }
  if (numericCode === 45 || numericCode === 48) {
    return { condition: "Berkabut", icon: "🌫️" };
  }
  if ([51, 53, 55, 56, 57].includes(numericCode)) {
    return { condition: "Gerimis", icon: "🌦️" };
  }
  if ([61, 80].includes(numericCode)) {
    return { condition: "Hujan Ringan", icon: "🌦️" };
  }
  if ([63, 66, 81].includes(numericCode)) {
    return { condition: "Hujan Sedang", icon: "🌧️" };
  }
  if ([65, 67, 82].includes(numericCode)) {
    return { condition: "Hujan Deras", icon: "⛈️" };
  }
  if ([71, 73, 75, 77, 85, 86].includes(numericCode)) {
    return { condition: "Hujan Salju", icon: "🌨️" };
  }
  if ([95, 96, 99].includes(numericCode)) {
    return { condition: "Badai Petir", icon: "⛈️" };
  }

  return { condition: "Berawan", icon: "☁️" };
}

/**
 * Ubah cuaca mentah kampus menjadi data badge siap tampil.
 * Suhu dibulatkan ke derajat terdekat; `null` tetap `null`.
 */
export function toWeatherBadgeData(
  weather: CampusWeather | null | undefined,
): WeatherBadgeData {
  if (!weather) {
    return { ...FALLBACK_WEATHER_BADGE };
  }

  const { condition, icon } = describeWeatherCode(weather.code);

  return {
    condition,
    temperature:
      weather.temperatureC === null ? null : Math.round(weather.temperatureC),
    icon,
  };
}

/**
 * Ambil status cuaca siap tampil (`{ condition, temperature, icon }`).
 * Memakai endpoint gratis Open-Meteo dengan koordinat kampus
 * (Sumedang/Bandung, overridable via env). Gagal → fallback `Cerah`.
 */
export async function fetchWeatherBadge(): Promise<WeatherBadgeData> {
  const weather = await fetchCampusWeather();
  return toWeatherBadgeData(weather);
}
