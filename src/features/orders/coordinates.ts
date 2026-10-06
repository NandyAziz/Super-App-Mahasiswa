import { z } from "zod";

/**
 * Latitude WGS84. Dibatasi -90..90 agar koordinat tidak mungkin terbalik atau
 * rusak (mis. karena satuan yang keliru).
 */
export const destinationLatSchema = z.coerce
  .number()
  .min(-90, "Latitude tidak valid")
  .max(90, "Latitude tidak valid");

/** Longitude WGS84. Dibatasi -180..180. */
export const destinationLngSchema = z.coerce
  .number()
  .min(-180, "Longitude tidak valid")
  .max(180, "Longitude tidak valid");

/**
 * Skema koordinat WGS84 yang OPSIONAL untuk payload Server Action.
 *
 * String kosong / `null` / `undefined` dinormalisasi menjadi `null` supaya form
 * tetap valid ketika pelanggan menolak atau tidak mendukung geolokasi — kolom
 * `destination_lat` / `destination_lng` pun disimpan `NULL`, bukan diisi nilai
 * tebakan. Nilai yang terisi tetap divalidasi rentangnya (tanpa default).
 */
export function optionalCoordinateSchema<T extends z.ZodType<number | null>>(
  schema: T,
  label: string,
) {
  return z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? null : value),
    schema.nullable(),
  ).refine((value) => value === null || Number.isFinite(value), {
    message: `${label} tidak valid`,
  });
}

export interface DestinationCoords {
  lat: number;
  lng: number;
}

/**
 * True bila kedua koordinat ada DAN berada di rentang WGS84 yang sah.
 * Pesanan lama (kolom NULL) atau koordinat rusak akan menghasilkan `false`
 * sehingga UI menyembunyikan peta alih-alih merender marker di tengah laut.
 */
export function isUsableCoords(value: {
  lat: number | null;
  lng: number | null;
}): value is { lat: number; lng: number } {
  const { lat, lng } = value;
  if (lat === null || lng === null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return false;
  }
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Sama seperti `isUsableCoords`, tetapi mengembalikan objek yang SUDAH
 * dipersempit ke `DestinationCoords | null`.
 *
 * Dipakai di sisi server/client ketika sumber datanya berupa dua properti
 * terpisah (mis. `order.destinationLat` / `order.destinationLng`): type-guard
 * `isUsableCoords` hanya mempersempit variabel parameternya, bukan properti
 * objek asal, sehingga narrowing tidak akan ikut terbawa ke sini.
 */
export function toDestinationCoords(
  lat: number | null,
  lng: number | null,
): DestinationCoords | null {
  if (
    lat === null ||
    lng === null ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }

  return { lat, lng };
}

// CATATAN: koordinat kampus (UTB / `CAMPUS_COORDS` di `lib/weather`) SENGAJA
// TIDAK dipakai sebagai fallback tujuan di sini. Memakai koordinat kampus akan
// membuat driver diarahkan ke lokasi yang salah untuk pesanan di luar kampus.
// Bila koordinat tujuan tidak tersedia, UI WAJIB menyatakannya secara terbuka
// alih-alih mengarang titik tujuan.

/**
 * URL "Buka di Google Maps" untuk smartphone driver.
 *
 * INVARIAN (jangan diubah tanpa sengaja):
 *   - HANYA berisi `api=1` + `destination` (koordinat pelanggan).
 *   - TIDAK BOLEH ada parameter `origin`, `origin_place_id`, `travelmode`,
 *     `waypoints`, atau titik asal apa pun yang di-hardcode.
 *
 * Mengapa `origin` sengaja dihilangkan: bila `origin` tidak dikirim, Google
 * Maps memakai lokasi perangkat saat tombol ditekan ("Your location" — GPS HP
 * driver) sebagai titik awal. Hasilnya rute dihitung dari posisi driver yang
 * SEBENARNYA dan terbaru, bukan posisi terakhir yang ter-cache di server.
 * Menghilangkan `origin` juga membuat fungsi ini bebas dari koordinat asal
 * hardcode, sehingga mustahil mengarahkan driver ke titik yang salah.
 *
 * `api=1` membuka aplikasi Google Maps bila terpasang, dan otomatis fallback
 * ke versi web bila tidak.
 *
 * @param coords Koordinat TUJUAN pelanggan. Jangan pernah mengoper koordinat
 *   mitra/kurir ke sini.
 */
export function buildGoogleMapsNavigationUrl(coords: DestinationCoords): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`;
}

/** Pesan standar saat koordinat presisi pelanggan tidak tersimpan. */
export const NO_DESTINATION_MESSAGE =
  "Lokasi presisi pelanggan tidak tersedia (Gunakan alamat teks)";