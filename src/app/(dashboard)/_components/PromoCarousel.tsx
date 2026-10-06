"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ChevronRight,
  FileText,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { PROMO_HREFS } from "@/features/promos/catalog";
import { cn } from "@/lib/utils";

interface Promo {
  id: string;
  /** Kategori kecil di atas judul (Voucher / Status / Fitur). */
  kicker: string;
  /** Judul utama kartu. */
  title: string;
  /** Baris penjelas opsional. */
  subtitle?: string;
  /** Kode promo untuk disalin manual, mis. "KODE: CAMPIFYNEW". */
  code?: string;
  /** Label CTA di dalam kartu (seluruh kartu adalah link-nya). */
  cta?: string;
  /** Tujuan kartu saat diketuk. */
  href: string;
  icon: LucideIcon;
  /** Warna solid untuk kicker (mis. `bg-indigo-600`). */
  accent: string;
  /** Warna teks ikon — ditulis eksplisit, bukan diturunkan dari `accent`. */
  iconTone: string;
  /** Badge berdenyut halus untuk kartu yang butuh perhatian (voucher & status). */
  pulse?: boolean;
  gradient: string;
}

/** Jeda auto-slide. */
const AUTOSLIDE_MS = 5_000;

/** Subscribe kosong — nilai mount tidak pernah berubah selama satu sesi. */
const subscribeToNothing = () => () => {};

/**
 * Deteksi "sudah ter-hydrate di browser" tanpa `setState` di dalam effect
 * (pola `useState` + `useEffect` melanggar aturan `set-state-in-effect`).
 *
 * `useSyncExternalStore` memang dirancang untuk ini:
 *   - `getServerSnapshot()` → `false`, dipakai saat SSR,
 *   - `getSnapshot()` → `true`, dipakai setelah hydration.
 * Hasilnya render pertama client identik dengan server, sehingga Framer Motion
 * tidak pernah menyuntik style/tabindex yang berbeda dan memicu hydration
 * mismatch. Setelah itu baru animasi diaktifkan.
 */
function useHasMounted(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
}

const PROMOS: Promo[] = [
  {
    id: "loyalty-ongkir-gratis",
    kicker: "PROGRAM LOYALITAS",
    title: "Gratis Ongkir Pesanan Ke-4! 🚚",
    subtitle: "Selesaikan 3 pesanan, transaksi ke-4 dan seterusnya otomatis bebas ongkir.",
    cta: "Mulai Pesan",
    href: PROMO_HREFS.LOYALTY3RD,
    icon: Truck,
    accent: "bg-emerald-600",
    iconTone: "text-emerald-600",
    pulse: true,
    gradient: "from-emerald-50",
  },
  {
    id: "paket-skripsi-tugas",
    kicker: "PAKET SKRIPSI & TUGAS",
    title: "Cetak >50 Halaman Diskon 15% 📄",
    subtitle: "Hemat untuk cetak laporan & jilid tebal",
    cta: "Cetak Sekarang",
    href: PROMO_HREFS.PAKET_SKRIPSI,
    icon: FileText,
    accent: "bg-indigo-600",
    iconTone: "text-indigo-600",
    gradient: "from-indigo-50",
  },
  {
    id: "patungan-kelas",
    kicker: "PATUNGAN KELAS",
    title: "Jastip Rombongan Ongkir Flat 🍕",
    subtitle: "Pesan bareng teman sekelas, ongkir cuma dihitung 1x",
    cta: "Titip Sekarang",
    href: PROMO_HREFS.PATUNGAN,
    icon: Users,
    accent: "bg-amber-600",
    iconTone: "text-amber-600",
    gradient: "from-amber-50",
  },
];

function findClosestIndex(track: HTMLDivElement): number {
  const cards = Array.from(track.children) as HTMLElement[];
  const center = track.scrollLeft + track.clientWidth / 2;

  return cards.reduce((closest, card, index) => {
    const closestCard = cards[closest];
    const cardCenter = card.offsetLeft + card.offsetWidth / 2;
    const closestCenter = closestCard.offsetLeft + closestCard.offsetWidth / 2;

    return Math.abs(cardCenter - center) < Math.abs(closestCenter - center)
      ? index
      : closest;
  }, 0);
}

/**
 * Satu kartu promo/status.
 *
 * `motion.div` membungkus `<Link>` agar animasi masuk/hover tidak mengganggu
 * elemen fokus milik Next.js.
 *
 * PERHATIAN HYDRATION — semua prop animasi dikunci sampai komponen benar-benar
 * ter-mount di browser (`hasMounted`):
 *   - Tanpa gerbang ini, Framer Motion menyuntik `style="opacity:0;
 *     transform:translateY(16px)"` dari `initial` saat SSR, tetapi render
 *     pertama di client bisa berbeda (mis. `whileInView` sudah aktif karena
 *     `IntersectionObserver` langsung terpicu) → hydration mismatch.
 *   - `whileTap` juga menyuntik atribut `tabindex="0"` pada elemen ini (lihat
 *     `framer-motion/dist/.../html/use-props.mjs`), padahal pembungkusnya bukan
 *     elemen interaktif — hasilnya tab stop mati (a11y) DAN atribut berbeda
 *     antara server & client. Karena itu `whileTap` TIDAK dipakai; umpan balik
 *     "tap" ditangani CSS `active:scale-95` pada `<Link>`.
 * - `useReducedMotion()` mengembalikan `null` saat SSR dan boolean setelah
 *   mount; nilainya tidak boleh memengaruhi render server.
 */
function PromoCard({
  promo,
  reduceMotion,
  hasMounted,
}: {
  promo: Promo;
  reduceMotion: boolean;
  hasMounted: boolean;
}) {
  const Icon = promo.icon;
  const animateReady = hasMounted && !reduceMotion;

  return (
    <motion.div
      initial={false}
      whileHover={animateReady ? { scale: 1.02 } : undefined}
      className="w-[85%] shrink-0 snap-start"
    >
      <Link
        href={promo.href}
        className={cn(
          "flex cursor-pointer items-center gap-3 overflow-hidden rounded-2xl border border-slate-200/80 bg-linear-to-br to-white p-4 shadow-xs transition-all duration-200 hover:shadow-md active:scale-[0.97]",
          promo.gradient,
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <motion.span
            initial={false}
            animate={
              animateReady && promo.pulse ? { scale: [1, 1.06, 1] } : undefined
            }
            transition={
              animateReady && promo.pulse
                ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
                : undefined
            }
            className={cn(
              "w-fit origin-left rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold text-white",
              promo.accent,
            )}
          >
            {promo.kicker}
          </motion.span>

          <p className="text-sm font-semibold text-slate-900">{promo.title}</p>

          {promo.subtitle ? (
            <p className="text-[0.7rem] text-slate-500">{promo.subtitle}</p>
          ) : null}

          {promo.code ? (
            <span className="mt-0.5 w-fit rounded-lg border border-dashed border-indigo-300 bg-white/80 px-2 py-1 font-mono text-[0.65rem] font-bold tracking-wide text-indigo-700">
              {promo.code}
            </span>
          ) : null}

          {promo.cta ? (
            <span className="mt-1 inline-flex w-fit items-center gap-0.5 rounded-xl bg-slate-900 px-2.5 py-1 text-[0.65rem] font-semibold text-white">
              {promo.cta}
              <ChevronRight className="h-3 w-3" />
            </span>
          ) : null}
        </div>

        <span
          className={cn(
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/80",
            promo.iconTone,
          )}
        >
          <Icon className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
        </span>
      </Link>
    </motion.div>
  );
}

export function PromoCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  /** Auto-slide berhenti sementara saat pengguna meng-hover atau menggeser. */
  const [isPaused, setIsPaused] = useState(false);
  const reduceMotion = useReducedMotion();

  /**
   * Gerbang hydration: `false` saat SSR & render pertama client, `true` setelah
   * hydration. Semua prop animasi hanya aktif setelah ini, sehingga HTML server
   * dan render pertama client identik (tidak ada inline style/tabindex yang
   * berbeda). Lihat catatan panjang pada `PromoCard`.
   */
  const hasMounted = useHasMounted();

  function handleScroll() {
    const track = scrollRef.current;
    if (!track) return;

    setActiveIndex(findClosestIndex(track));
  }

  /** Scroll halus ke kartu pada `index` (dipakai timer & klik dot). */
  const scrollToIndex = useCallback(
    (index: number) => {
      const track = scrollRef.current;
      if (!track) return;

      const card = track.children[index] as HTMLElement | undefined;
      if (!card) return;

      // Matematika yang sama dengan `findClosestIndex`: pusatkan kartu.
      track.scrollTo({
        left: card.offsetLeft + card.offsetWidth / 2 - track.clientWidth / 2,
        behavior: reduceMotion ? "auto" : "smooth",
      });
      setActiveIndex(index);
    },
    [reduceMotion],
  );

  // Auto-slide. Berhenti saat di-hover, saat pengguna sedang menggeser, dan
  // untuk pengguna yang memilih `prefers-reduced-motion`.
  useEffect(() => {
    if (isPaused || reduceMotion || PROMOS.length < 2) {
      return;
    }

    const timer = setInterval(() => {
      setActiveIndex((current) => {
        const next = (current + 1) % PROMOS.length;
        scrollToIndex(next);
        return next;
      });
    }, AUTOSLIDE_MS);

    return () => clearInterval(timer);
  }, [isPaused, reduceMotion, scrollToIndex]);

  return (
    <section
      aria-label="Promo & status layanan Campify"
      className="flex flex-col gap-2"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onTouchStart={() => setIsPaused(true)}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scrollbar-none px-4 py-2"
      >
        {PROMOS.map((promo) => (
          <PromoCard
            key={promo.id}
            promo={promo}
            reduceMotion={reduceMotion ?? false}
            hasMounted={hasMounted}
          />
        ))}
      </div>

      <div className="flex items-center justify-center gap-1.5">
        {PROMOS.map((promo, index) => {
          const isActive = index === activeIndex;

          return (
            <button
              key={promo.id}
              type="button"
              onClick={() => scrollToIndex(index)}
              aria-label={`Tampilkan promo ${index + 1}`}
              aria-current={isActive ? "true" : undefined}
              className="flex h-6 w-3 cursor-pointer items-center justify-center"
            >
              <motion.span
                initial={false}
                className={cn(
                  "block h-1.5 rounded-full",
                  isActive ? "bg-indigo-600" : "bg-slate-300",
                )}
                animate={{ width: isActive ? 16 : 6 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}
