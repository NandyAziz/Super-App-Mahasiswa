import Link from "next/link";
import Image from "next/image";
import { Bell } from "lucide-react";

/** Tombol aksi cepat di header (notifikasi). */
const ACTION_BUTTON_CLASS =
  "relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-xs transition-all duration-200 hover:text-indigo-600 active:scale-95";

export function HomeHeader() {
  return (
    <header className="flex items-center justify-between gap-3">
      <Link href="/" aria-label="Beranda Campify" className="flex items-center">
        <Image
          src="/images/Campify.png"
          alt="Campify Logo"
          width={280}
          height={80}
          priority
          className="h-9 w-auto min-w-30 object-contain"
        />
      </Link>

      <div className="flex items-center gap-2">
        <Link
          href="/inbox"
          aria-label="Notifikasi"
          className={ACTION_BUTTON_CLASS}
        >
          <Bell className="h-4.5 w-4.5" />
          <span
            aria-hidden="true"
            className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white"
          />
        </Link>

        <Link
          href="/profile"
          aria-label="Profil saya"
          className="shrink-0 transition-all duration-200 active:scale-95"
        >
          <Image
            src="/avatar-mahasiswa.svg"
            alt="Foto profil mahasiswa"
            width={40}
            height={40}
            unoptimized
            priority
            className="h-9 w-9 rounded-full border border-slate-200 object-cover"
          />
        </Link>
      </div>
    </header>
  );
}


