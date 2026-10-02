"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  ArrowRight,
  BookOpenCheck,
  Code,
  GraduationCap,
  Printer,
  Rocket,
  ShoppingBag,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Kunci penyimpanan status perkenalan (walkthrough) di browser. */
const ONBOARDING_STORAGE_KEY = "campify_onboarding_seen";

interface WalkthroughFeature {
  icon: LucideIcon;
  label: string;
  tint: string;
}

interface WalkthroughSlide {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  /** Path aset ilustrasi kustom (PNG transparan di `public/images/onboarding`). */
  image: string;
  features: WalkthroughFeature[];
}

const SLIDES: WalkthroughSlide[] = [
  {
    id: "layanan",
    eyebrow: "Semua dalam satu aplikasi",
    title: "Solusi Kebutuhan Kampus",
    description:
      "Dari titip beli sampai bantuan tugas, semua layanan mahasiswa tersedia di satu tempat.",
    image: "/images/onboarding/slide1.png",
    features: [
      { icon: ShoppingBag, label: "Jastip", tint: "bg-orange-50 text-orange-600" },
      { icon: Printer, label: "Cetak", tint: "bg-blue-50 text-blue-600" },
      { icon: Code, label: "Proyek IT", tint: "bg-violet-50 text-violet-600" },
      { icon: GraduationCap, label: "Tutor", tint: "bg-emerald-50 text-emerald-600" },
      { icon: BookOpenCheck, label: "Akademik", tint: "bg-indigo-50 text-indigo-600" },
    ],
  },
  {
    id: "terpercaya",
    eyebrow: "Diproses tim internal",
    title: "Cepat & Terpercaya",
    description:
      "Setiap pesanan diantar dan dikelola langsung oleh tim internal Campify, jadi lebih cepat dan aman.",
    image: "/images/onboarding/slide2.png",
    features: [],
  },
  {
    id: "qris",
    eyebrow: "Checkout instan",
    title: "Bayar Praktis via QRIS",
    description:
      "Selesaikan pembayaran hanya dengan sekali pindai QRIS. Praktis, cepat, tanpa ribet.",
    image: "/images/onboarding/slide3.png",
    features: [],
  },
];

/** Daftar listener aktif untuk sinkronisasi status perkenalan antar-tab. */
let seenListeners: Array<() => void> = [];

/** Baca status "sudah dilihat" dari localStorage (aman bila storage diblokir). */
function readSeen(): boolean {
  try {
    return window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
  } catch {
    return true;
  }
}

/** Beri tahu seluruh listener (dipakai saat status berubah di tab yang sama). */
function notifySeenChange(): void {
  for (const listener of seenListeners) {
    listener();
  }
}

/**
 * Sumber eksternal untuk `useSyncExternalStore`. Server selalu dianggap
 * "sudah dilihat" sehingga tidak ada mismatch hidrasi; sisi client langsung
 * membaca nilai asli dari localStorage setelah hidrasi.
 */
function subscribeSeen(listener: () => void): () => void {
  seenListeners.push(listener);
  window.addEventListener("storage", listener);

  return () => {
    seenListeners = seenListeners.filter((item) => item !== listener);
    window.removeEventListener("storage", listener);
  };
}

function getSeenSnapshot(): boolean {
  return readSeen();
}

function getSeenServerSnapshot(): boolean {
  return true;
}

/** Micro card layanan (dipakai pada slide yang menampilkan banyak layanan). */
function SlideFeature({ feature }: { feature: WalkthroughFeature }) {
  const Icon = feature.icon;

  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border border-slate-200/80 bg-white/80 p-2 shadow-xs backdrop-blur transition-all hover:scale-105">
      <span
        className={cn(
          "flex items-center justify-center rounded-md p-1",
          feature.tint,
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="text-[11px] font-semibold text-slate-700">
        {feature.label}
      </span>
    </div>
  );
}

/** Panel visual bersih untuk satu slide perkenalan (gaya SaaS / Linear). */
function SlideVisual({ slide }: { slide: WalkthroughSlide }) {
  const hasChips = slide.features.length > 1;

  return (
    <div className="relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-slate-200/60 bg-gradient-to-b from-slate-50 to-indigo-50/50 p-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-12 -right-10 h-32 w-32 rounded-full bg-indigo-100/50 blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-14 -left-10 h-32 w-32 rounded-full bg-slate-100/70 blur-3xl"
      />

      <Image
        src={slide.image}
        alt={slide.title}
        width={140}
        height={140}
        priority
        className="relative mx-auto h-32 w-auto object-contain drop-shadow-md"
      />

      {hasChips ? (
        <div className="relative flex flex-wrap justify-center gap-2">
          {slide.features.map((feature) => (
            <SlideFeature key={feature.label} feature={feature} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Isi lengkap satu slide: visual + judul + deskripsi. */
function SlideContent({ slide }: { slide: WalkthroughSlide }) {
  return (
    <div className="flex w-full shrink-0 flex-col gap-3 px-1">
      <SlideVisual slide={slide} />

      <div className="space-y-1.5 text-center">
        <p className="text-[0.7rem] font-semibold tracking-wide text-indigo-500 uppercase">
          {slide.eyebrow}
        </p>
        <h2 className="text-lg font-bold text-slate-900">{slide.title}</h2>
        <p className="mx-auto max-w-[34ch] text-xs leading-relaxed text-slate-500">
          {slide.description}
        </p>
      </div>
    </div>
  );
}

/**
 * Modal perkenalan (walkthrough) sekali pakai: menampilkan 3 slide layanan
 * Campify saat pengguna pertama kali membuka aplikasi. Rendernya ditunda ke
 * sisi client lalu disimpan ke `localStorage` agar hanya muncul sekali.
 */
export function WalkthroughModal() {
  const seen = useSyncExternalStore(
    subscribeSeen,
    getSeenSnapshot,
    getSeenServerSnapshot,
  );
  const open = !seen;
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const complete = useCallback(() => {
    try {
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    } catch {
      // localStorage tidak tersedia (mis. mode privat) — abaikan.
    }
    notifySeenChange();
  }, []);

  // Kunci scroll body & tutup dengan tombol Escape saat modal terbuka.
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        complete();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, complete]);

  if (!open) {
    return null;
  }

  const isLast = activeIndex === SLIDES.length - 1;

  function goNext(): void {
    if (isLast) {
      complete();
      return;
    }
    setActiveIndex((index) => index + 1);
  }

  function handleTouchStart(event: React.TouchEvent): void {
    touchStartX.current = event.touches[0].clientX;
  }

  function handleTouchEnd(event: React.TouchEvent): void {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start === null) {
      return;
    }

    const delta = event.changedTouches[0].clientX - start;
    if (delta < -50 && !isLast) {
      setActiveIndex((index) => index + 1);
    } else if (delta > 50 && activeIndex > 0) {
      setActiveIndex((index) => index - 1);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <button
        type="button"
        aria-label="Lewati perkenalan"
        onClick={complete}
        className="absolute inset-0 cursor-default bg-slate-900/60 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Perkenalan Campify"
        className="relative z-10 mx-4 max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl border border-white/40 bg-white/80 p-5 shadow-2xl backdrop-blur-xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[0.7rem] font-semibold text-indigo-600">
            <Sparkles className="h-3.5 w-3.5" />
            Kenalan dengan Campify
          </span>
          <button
            type="button"
            onClick={complete}
            className="rounded-full px-3 py-1 text-[0.7rem] font-semibold text-slate-500 transition-all duration-200 hover:bg-slate-100 active:scale-95"
          >
            Lewati
          </button>
        </div>

        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="overflow-hidden"
        >
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {SLIDES.map((slide) => (
              <SlideContent key={slide.id} slide={slide} />
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5">
          {SLIDES.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`Slide ${index + 1}`}
              aria-current={index === activeIndex}
              onClick={() => setActiveIndex(index)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-200 active:scale-95",
                index === activeIndex ? "w-6 bg-indigo-600" : "w-1.5 bg-slate-300",
              )}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={goNext}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-indigo-700 active:scale-95"
        >
          {isLast ? (
            <>
              <Rocket className="h-4 w-4" />
              <span>Mulai Sekarang</span>
            </>
          ) : (
            <>
              <span>Lanjut</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>,
    document.body,
  );
}

