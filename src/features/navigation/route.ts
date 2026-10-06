import type { DestinationCoords } from "@/features/orders/coordinates";

/** Hasil rute dari OSRM: polyline, jarak (meter), dan durasi (detik). */
export interface RouteInfo {
  /** Pasangan [lat, lng] sesuai urutan yang dipakai Leaflet. */
  points: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
}

const OSRM_BASE_URL = "https://router.project-osrm.org/route/v1/driving";
const ROUTE_TIMEOUT_MS = 8_000;

/** Rute yang gagal diambil sengaja `null` (bukan dilempar). */
export type RouteResult = RouteInfo | null;

interface OsrmRouteResponse {
  code: string;
  routes?: {
    distance: number;
    duration: number;
    geometry: { type: string; coordinates: [number, number][] };
  }[];
}

/**
 * Ambil rute jalan dari `from` ke `to` memakai OSRM (gratis, tanpa API key).
 *
 * Polyline OSRM berformat `[lng, lat]` (urutan GeoJSON) dan harus dibalik
 * sebelum dipakai Leaflet yang memakai `[lat, lng]`.
 *
 * Kegagalan (offline, timeout, rute tidak ditemukan, respons tidak valid)
 * selalu menghasilkan `null` — peta tetap dirender dengan garis lurus sebagai
 * cadangan, bukan gagal total.
 */
export async function fetchOsrmRoute(
  from: DestinationCoords,
  to: DestinationCoords,
): Promise<RouteResult> {
  const url =
    `${OSRM_BASE_URL}/${from.lng},${from.lat};${to.lng},${to.lat}` +
    "?overview=full&geometries=geojson";

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(ROUTE_TIMEOUT_MS),
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as OsrmRouteResponse;
    const route = payload.routes?.[0];

    if (payload.code !== "Ok" || !route) {
      return null;
    }

    const points = route.geometry.coordinates.map(
      ([lng, lat]) => [lat, lng] as [number, number],
    );

    if (points.length === 0) {
      return null;
    }

    return {
      points,
      distanceMeters: route.distance,
      durationSeconds: route.duration,
    };
  } catch {
    return null;
  }
}

/** "1,4 km" — jarak dibulatkan ke 1 desimal, minimum 0,1 km. */
export function formatDistanceKm(meters: number): string {
  return `${Math.max(meters / 1000, 0).toFixed(1).replace(".", ",")} km`;
}

/** "12 menit" / "1 jam 5 menit". */
export function formatDuration(seconds: number): string {
  const totalMinutes = Math.max(Math.round(seconds / 60), 1);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} menit`;
  }
  if (minutes === 0) {
    return `${hours} jam`;
  }
  return `${hours} jam ${minutes} menit`;
}