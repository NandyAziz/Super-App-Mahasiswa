import { MobileFrame } from "@/components/layouts/MobileFrame";

/**
 * Kerangka halaman publik (tanpa sesi), mis. `/track`.
 *
 * Berbeda dari `(dashboard)` yang menambahkan `BottomNav` khusus pengguna
 * login, halaman publik hanya memakai kanvas mobile `max-w-md`.
 */
export default function TrackLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <MobileFrame className="bg-slate-50">{children}</MobileFrame>;
}
