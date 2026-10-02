import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles } from "lucide-react";

export function HeroPromoBanner() {
  return (
    <section
      aria-labelledby="hero-promo-heading"
      className="relative shrink-0 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-600 p-5 text-white shadow-md shadow-indigo-500/10"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.35),transparent_70%)] blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(129,140,248,0.45),transparent_70%)] blur-2xl"
      />

      <div className="relative flex items-center justify-between gap-4">
        <div className="flex flex-1 flex-col gap-2.5">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium text-indigo-50">
            <Sparkles className="h-3.5 w-3.5" />
            Halo, Mahasiswa!
          </span>
          <h1
            id="hero-promo-heading"
            className="text-lg leading-snug font-bold tracking-tight text-white"
          >
            Butuh Jastip / Cetak Dokumen?
          </h1>
          <p className="max-w-[30ch] text-xs leading-relaxed text-indigo-100">
            Semua kebutuhan kampus dalam satu aplikasi..
          </p>
          <div>
            <Link
              href="/jastip"
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-indigo-700 shadow-sm transition-all duration-200 hover:bg-indigo-50 active:scale-95"
            >
              Pesan Sekarang
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <Image
          src="/images/mascot/bear-hero.png"
          alt="Maskot Campify"
          width={120}
          height={120}
          priority
          className="h-24 w-24 shrink-0 object-contain drop-shadow-lg"
        />
      </div>
    </section>
  );
}

