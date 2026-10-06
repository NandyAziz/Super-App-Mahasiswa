import type { OrderService } from "@/features/orders/types";

/**
 * Layanan yang punya alur antar dengan mitra/kurir fisik, sehingga relevan
 * memakai peta navigasi driver di `/admin`.
 *
 * Hanya dua layanan yang benar-benar involve Kurir/Driver:
 *   - `jastip`   — jemput/antar barang.
 *   - `printing` — tim ambil berkas, cetak di fotokopi, lalu antar hasil.
 *
 * `projects`, `tutoring`, dan `academic` dikerjakan sepenuhnya secara digital
 * (remote) — tidak ada kurir yang perlu bernavigasi, sehingga tombol
 * "Navigasi" disembunyikan untuk layanan tersebut.
 */
export const DRIVER_NAVIGATION_SERVICES: readonly OrderService[] = [
  "jastip",
  "printing",
];

/** True bila layanan ini boleh menampilkan peta navigasi driver. */
export function hasDriverNavigation(service: OrderService): boolean {
  return DRIVER_NAVIGATION_SERVICES.includes(service);
}