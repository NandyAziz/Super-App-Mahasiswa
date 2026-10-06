import Link from "next/link";
import { PackageSearch } from "lucide-react";

/**
 * Tombol "Masuk sebagai Tamu" yang menempel di dasar kartu auth.
 *
 * Dipakai `/login` maupun `/register` agar jalan pintas ke pelacakan publik
 * (`/track`) selalu berada di posisi dan gaya yang sama.
 */
export function GuestTrackLink() {
  return (
    <Link
      href="/track"
      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold text-slate-600 transition-all duration-200 hover:bg-slate-100 active:scale-95"
    >
      <PackageSearch className="h-4 w-4" />
      <span>Masuk sebagai Tamu</span>
    </Link>
  );
}
