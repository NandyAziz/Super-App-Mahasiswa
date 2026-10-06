"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

/** Kunci penyimpanan status launch screen di `sessionStorage` (per sesi tab). */
const LAUNCH_STORAGE_KEY = "campify_launch_seen";

/** Durasi tampil launch screen sebelum mulai memudar (milidetik). */
const LAUNCH_DURATION_MS = 2000;

/**
 * Latar splash. Dibuat PUTIH bersih agar sama dengan latar aplikasi, sehingga
 * transisi ke Login/Home tidak terasa berganti warna.
 *
 * Kontras GIF diselesaikan di sisi maskot (badge rounded + `mix-blend-multiply`),
 * bukan dengan mewarnai seluruh layar — lihat catatan pada `SplashBadge`.
 */
const SPLASH_BG = "#ffffff";

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
 * Launch / splash screen sekali pakai (khas aplikasi native).
 *
 * Menampilkan maskot beranimasi + progress bar HANYA saat aplikasi pertama
 * dimuat pada sebuah sesi, lalu bertransisi mulus ke Login/Home memakai
 * `AnimatePresence` dari Framer Motion.
 *
 * STRATEGI TANPA FLASH DUA ARAH:
 *   1. `veilVisible` = `true` sejak awal → lapisan putih penuh ikut dirender
 *      di HTML server dan MENUTUPI konten app sejak frame pertama. Dengan
 *      begini form login tidak pernah sempat "flash" sebelum pemeriksaan
 *      "sekali ini" selesai.
 *   2. `showSplash` = `false` sejak awal dan hanya menjadi `true` (di dalam
 *      callback frame, aman lint) bila terbukti muat pertama. Maskot GIF
 *      tidak ikut ter-render sejak awal, sehingga tidak berkedip saat
 *      pengulangan — pengulang hanya melihat veil yang cepat terangkat.
 *
 * KUNCI HYDRATION: state awal identik antara server & client, dan seluruh
 * `motion.*` memakai `initial={false}` → tidak ada hydration mismatch.
 *
 * JANGAN dipakai sebagai indikator loading umum — untuk itu pakai
 * `features/auth/components/OAuthLoadingOverlay`.
 */
export function LaunchScreen() {
  // `true` di server & client: veil putih menutup konten sejak frame pertama,
  // sehingga form di belakang tidak sempat terlihat sebelum pemeriksaan selesai.
  const [veilVisible, setVeilVisible] = useState(true);
  // Hanya menjadi `true` (di dalam effect) untuk muat pertama → maskot tampil.
  const [showSplash, setShowSplash] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let progressFrame = 0;
    let fadeTimer = 0;

    // Semua setState dilakukan di dalam callback frame (bukan tubuh efek)
    // sehingga aman dari lint `set-state-in-effect` dan memastikan
    // `sessionStorage` dibaca di client sebelum keputusan diambil.
    const startFrame = window.requestAnimationFrame(() => {
      // Pengulang: angkat veil saja (cepat, tanpa maskot) → konten langsung
      // terlihat dan GIF tidak ikut berkedip.
      if (hasLaunched()) {
        setVeilVisible(false);
        return;
      }

      // Muat pertama: tonjolkan maskot di atas veil, jalankan progress, lalu
      // angkat veil setelah durasi.
      markLaunched();
      setShowSplash(true);

      progressFrame = window.requestAnimationFrame(() => {
        setProgress(100);
      });

      fadeTimer = window.setTimeout(() => {
        setVeilVisible(false);
      }, LAUNCH_DURATION_MS);
    });

    return () => {
      window.cancelAnimationFrame(startFrame);
      window.cancelAnimationFrame(progressFrame);
      window.clearTimeout(fadeTimer);
    };
  }, []);

  return (
    <AnimatePresence>
      {veilVisible ? (
        <motion.div
          key="campify-splash"
          role="status"
          aria-live="polite"
          aria-label="Memuat Campify"
          initial={false}
          // Muat pertama: memudar sambil membesar (efek "terungkap").
          // Pengulangan: veil kosong hanya memudar singkat (tanpa maskot).
          exit={{ opacity: 0, scale: showSplash ? 1.04 : 1 }}
          transition={{
            duration: showSplash ? 0.5 : 0.15,
            ease: [0.4, 0, 0.2, 1],
          }}
          style={{ backgroundColor: SPLASH_BG }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-between px-6 py-12"
        >
          {showSplash ? (
            <>
              <section className="flex flex-1 flex-col items-center justify-center gap-6">
            <motion.div
              initial={false}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="relative"
            >
              {/*
                BADGE ROUNDED + MIX-BLEND-MULTIPLY
                Masalah lama: GIF punya latar hampir-putih (RGB 246,249,249),
                sehingga tepi persegi kotaknya terlihat samar di atas latar
                putih aplikasi.

                Solusi dua lapis:
                  1. Badge rounded ber-gradient lembut (indigo→putih→violet)
                     mengubah "kotak GIF" menjadi kartu yang disengaja, jadi
                     tidak ada lagi tepi persegi yang harus disembunyikan.
                  2. `mix-blend-multiply` pada gambar membuat latar hampir-putih
                     GIF MENYERAP warna gradient di belakangnya, sehingga batas
                     GIF melebur ke dalam badge alih-alih membentuk tepi pucat.

                Hasilnya maskot menyatu mulus dengan latar putih aplikasi.
              */}
              <div className="flex h-64 w-64 items-center justify-center overflow-hidden rounded-[2.75rem] bg-gradient-to-br from-indigo-100/70 via-white to-violet-100/70 p-5 ring-1 ring-slate-900/5 shadow-[0_24px_60px_-24px_rgba(79,70,229,0.5)]">
                <Image
                  src="/images/mascot/bear-loading.gif"
                  alt="Maskot Campify sedang memuat"
                  width={224}
                  height={224}
                  priority
                  unoptimized
                  className="h-full w-full object-contain mix-blend-multiply"
                />
              </div>
            </motion.div>

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
            </>
          ) : (
            // Pengulangan: veil kosong (putih) — pelindung sementara sebelum
            // konten app terangkat, tanpa maskot apa pun.
            <div />
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

