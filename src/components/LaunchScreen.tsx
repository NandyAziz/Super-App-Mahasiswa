"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/** Kunci penyimpanan status launch screen di `sessionStorage` (per sesi tab). */
const LAUNCH_STORAGE_KEY = "campify_launch_seen";

/** Durasi tampil launch screen sebelum mulai memudar (milidetik). */
const LAUNCH_DURATION_MS = 2000;

/** Durasi animasi fade-out, disinkronkan dengan `duration-500` Tailwind. */
const FADE_DURATION_MS = 500;

/** Baca status "sudah ditampilkan" dari sessionStorage (aman bila diblokir). */
function hasLaunched(): boolean {
  try {
    return window.sessionStorage.getItem(LAUNCH_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

/** Tandai launch screen sudah ditampilkan pada sesi browser berjalan. */
function markLaunched(): void {
  try {
    window.sessionStorage.setItem(LAUNCH_STORAGE_KEY, "true");
  } catch {
    // sessionStorage tidak tersedia (mis. mode privat) — abaikan.
  }
}

/**
 * Launch / splash screen sekali pakai: menampilkan maskot beruang animasi,
 * nama aplikasi, dan progress bar saat aplikasi pertama kali dimuat pada
 * sebuah sesi browser. Status disimpan di `sessionStorage` agar hanya muncul
 * sekali per sesi, lalu memudar dengan halus setelah kurang lebih 2 detik.
 */
export function LaunchScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [isMounted, setIsMounted] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let progressFrame = 0;
    let fadeTimer = 0;
    let unmountTimer = 0;

    // Tunggu frame pertama: sembunyikan bila sudah tampil, atau mulai animasi.
    const startFrame = window.requestAnimationFrame(() => {
      if (hasLaunched()) {
        setIsVisible(false);
        setIsMounted(false);
        return;
      }

      markLaunched();

      progressFrame = window.requestAnimationFrame(() => {
        setProgress(100);
      });

      fadeTimer = window.setTimeout(() => {
        setIsVisible(false);
      }, LAUNCH_DURATION_MS);

      unmountTimer = window.setTimeout(() => {
        setIsMounted(false);
      }, LAUNCH_DURATION_MS + FADE_DURATION_MS);
    });

    return () => {
      window.cancelAnimationFrame(startFrame);
      window.cancelAnimationFrame(progressFrame);
      window.clearTimeout(fadeTimer);
      window.clearTimeout(unmountTimer);
    };
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Memuat Campify"
      className={cn(
        "fixed inset-0 z-[100] bg-white flex flex-col justify-between items-center py-12 px-6",
        "transition-opacity duration-500",
        !isVisible && "opacity-0 pointer-events-none",
      )}
    >
      <section className="flex flex-1 flex-col items-center justify-center gap-6">
        <Image
          src="/images/mascot/bear-loading.gif"
          alt="Maskot Campify sedang memuat"
          width={224}
          height={224}
          priority
          unoptimized
          className="w-56 h-56 object-contain"
        />

        <div className="space-y-1 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Campify
          </h1>
          <p className="text-sm font-medium text-slate-500">
            Segalanya Lebih Mudah
          </p>
        </div>
      </section>

      <footer className="flex w-full max-w-xs flex-col items-center gap-4">
        <div
          role="progressbar"
          aria-label="Memuat aplikasi"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-1.5 w-full overflow-hidden rounded-full bg-indigo-100"
        >
          <div
            className="h-full rounded-full bg-indigo-600 transition-[width] duration-[2000ms] ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-xs font-medium text-slate-400">
          v1.0 • Untuk Mahasiswa
        </p>
      </footer>
    </div>
  );
}
