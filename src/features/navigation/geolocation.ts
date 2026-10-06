import type { DestinationCoords } from "@/features/orders/coordinates";

/** Opsi default: presisi, batas waktu wajar, dan memakai cache 60 detik. */
const DEFAULT_POSITION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 60_000,
};

/**
 * Ambil posisi perangkat sebagai Promise.
 *
 * **Selalu resolve, tidak pernah reject** — kegagalan (izin ditolak, GPS tidak
 * tersedia, timeout, konteks non-browser) menghasilkan `null`. Ini penting
 * agar pemanggil tidak perlu try/catch dan supaya alur pemesanan tetap jalan
 * walau pelanggan tidak mengizinkan lokasi.
 *
 * Tidak pernah mengembalikan koordinat tebakan: hasilnya `null` bila lokasi
 * tidak benar-benar diketahui.
 */
export function requestCurrentPosition(
  options: PositionOptions = DEFAULT_POSITION_OPTIONS,
): Promise<DestinationCoords | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => resolve(null),
      options,
    );
  });
}