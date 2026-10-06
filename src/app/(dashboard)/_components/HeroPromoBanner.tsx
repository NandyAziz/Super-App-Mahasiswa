"use client";

import Link from "next/link";
import Image from "next/image";
import { useSyncExternalStore } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

/** Subscribe kosong — nilai mount tidak pernah berubah selama satu sesi. */
const subscribeToNothing = () => () => {};

/**
 * Deteksi "sudah ter-hydrate di browser" dengan `useSyncExternalStore`.
 *
 * Pola `useState` + `useEffect` tidak dipakai karena melanggar aturan lint
 * `set-state-in-effect`. `useSyncExternalStore` justru dirancang untuk ini:
 * snapshot server `false`, snapshot client `true`. Akibatnya render pertama di
 * client identik dengan HTML hasil SSR, sehingga Framer Motion tidak pernah
 * menyuntik inline style berbeda dan memicu hydration mismatch. Semua animasi
 * (termasuk yang looping) baru aktif setelah nilai ini menjadi `true`.
 *
 * Catatan: `whileTap` sengaja tidak dipakai di mana pun — Framer Motion
 * menyuntik atribut `tabindex="0"` pada elemennya (lihat
 * `framer-motion/dist/.../html/use-props.mjs`) sehingga elemen non-interaktif
 * menjadi tab stop mati. Umpan balik "tap" ditangani CSS `active:scale-95`.
 */
function useHasMounted(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
}

export function HeroPromoBanner() {
  const hasMounted = useHasMounted();
  const reduceMotion = useReducedMotion();
  const animateReady = hasMounted && !reduceMotion;

  return (
    <section
      aria-labelledby="hero-promo-heading"
      className="relative shrink-0 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-600 p-5 text-white shadow-md shadow-indigo-500/10"
    >
      {/*
        Latar dekoratif: lingkaran cahaya berlapis + cincin glass, semuanya
        CSS murni (tanpa animasi) agar SSR & client selalu identik.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.35),transparent_70%)] blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(129,140,248,0.45),transparent_70%)] blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/3 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(96,165,250,0.28),transparent_70%)] blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-3xl bg-white/5 ring-1 ring-white/10 ring-inset"
      />

      <div className="relative flex items-center justify-between gap-4">
        <div className="flex flex-1 flex-col gap-2.5">
          {/*
            Pill sapaan: glassmorphism + denyut halus. `initial={false}`
            menjaga render pertama tetap sama dengan server.
          */}
          <motion.span
            initial={false}
            animate={animateReady ? { scale: [1, 1.04, 1] } : undefined}
            transition={
              animateReady
                ? { duration: 3.2, repeat: Infinity, ease: "easeInOut" }
                : undefined
            }
            className="inline-flex w-fit origin-left items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-2.5 py-0.5 text-xs font-medium text-indigo-50 shadow-sm backdrop-blur-md"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Halo, Mahasiswa!
          </motion.span>
          <h1
            id="hero-promo-heading"
            className="text-lg leading-snug font-bold tracking-tight text-white"
          >
            Butuh Jastip / Cetak Dokumen?
          </h1>
          <p className="max-w-[30ch] text-xs leading-relaxed text-indigo-100">
            Semua kebutuhan kampus dalam satu aplikasi..
          </p>
          <motion.div
            initial={false}
            whileHover={animateReady ? { scale: 1.02 } : undefined}
            whileFocus={animateReady ? { scale: 1.02 } : undefined}
            className="w-fit"
          >
            <Link
              href="/jastip"
              className="group/cta relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-white px-4 py-2 text-xs font-semibold text-indigo-700 shadow-sm transition-all duration-200 hover:bg-indigo-50 active:scale-95"
            >
              {/*
                Sapuan kilau (shimmer) hanya saat hover — CSS murni, bukan loop
                animasi, sehingga tidak mengganggu saat banner diam.
              */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-linear-to-r from-transparent via-indigo-200/70 to-transparent opacity-0 group-hover/cta:animate-[shimmer-sweep_1.1s_ease-in-out_forwards]"
              />
              <span className="relative">Pesan Sekarang</span>
              <ArrowRight className="relative h-4 w-4 transition-transform duration-200 group-hover/cta:translate-x-1" />
            </Link>
          </motion.div>
        </div>

        {/*
          Maskot 3D: melayang pelan dengan bayangan di bawah yang ikut
          mengembang/mengecil mengikuti ketinggian — memberi kesan melayang di
          atas lantai. Durasi keduanya dikunci sama (4.2s) agar sinkron.
        */}
        <div className="relative shrink-0">
          <motion.span
            aria-hidden="true"
            initial={false}
            animate={
              animateReady
                ? { scaleX: [1, 0.76, 1], opacity: [0.34, 0.16, 0.34] }
                : undefined
            }
            transition={
              animateReady
                ? { duration: 4.2, repeat: Infinity, ease: "easeInOut" }
                : undefined
            }
            className="absolute -bottom-1 left-1/2 h-3 w-16 -translate-x-1/2 rounded-[50%] bg-indigo-950/45 blur-md"
          />
          <motion.div
            initial={false}
            animate={animateReady ? { y: [0, -6, 0] } : undefined}
            transition={
              animateReady
                ? { duration: 4.2, repeat: Infinity, ease: "easeInOut" }
                : undefined
            }
          >
            <Image
              src="/images/mascot/bear-hero.png"
              alt="Maskot Campify"
              width={120}
              height={120}
              priority
              className="h-24 w-24 object-contain drop-shadow-lg"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

