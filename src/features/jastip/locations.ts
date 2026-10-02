import type { SelectOption } from "@/components/ui/SelectField";

/**
 * Gedung / lokasi pengantaran yang tersedia di area kampus. Dipakai oleh
 * form Jastip Cepat sebagai selector "Lokasi Antar / Gedung".
 */
export const JASTIP_BUILDING_OPTIONS: SelectOption[] = [
  { value: "Gedung A - Fakultas Teknik", label: "Gedung A · Fakultas Teknik" },
  {
    value: "Gedung B - Fakultas Ekonomi & Bisnis",
    label: "Gedung B · Fakultas Ekonomi & Bisnis",
  },
  {
    value: "Gedung C - Fakultas Ilmu Komputer",
    label: "Gedung C · Fakultas Ilmu Komputer",
  },
  { value: "Gedung D - Fakultas Keguruan", label: "Gedung D · Fakultas Keguruan" },
  { value: "Perpustakaan Pusat", label: "Perpustakaan Pusat" },
  { value: "GOR / Sarana Olahraga", label: "GOR · Sarana Olahraga" },
  { value: "Masjid Kampus", label: "Masjid Kampus" },
  { value: "Area Kantin Kampus", label: "Area Kantin Kampus" },
  { value: "Asrama / Kos Mahasiswa", label: "Asrama / Kos Mahasiswa" },
];

/**
 * Nilai jemput default. Pada alur "custom request", kurir yang menentukan
 * merchant/penjual sesuai catatan yang diminta, sehingga pemesan cukup memilih
 * lokasi pengantaran.
 */
export const JASTIP_DEFAULT_PICKUP = "Area Kampus (disesuaikan kurir)";

/**
 * Memadatkan kontak WhatsApp pemesan + catatan jemput default ke dalam kolom
 * teks `pickup_location`. Tabel `jastip_orders` tidak punya kolom kontak
 * khusus, sehingga nomor WA digabung di sini agar kurir tetap bisa
 * menghubungi pemesan (pola serupa dengan `buildTutoringSubject`).
 */
export function buildJastipPickupLabel(whatsapp: string): string {
  return `WA ${whatsapp.trim()} · ${JASTIP_DEFAULT_PICKUP}`;
}
