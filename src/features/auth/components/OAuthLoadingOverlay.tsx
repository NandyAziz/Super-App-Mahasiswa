"use client";

import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

interface OAuthLoadingOverlayProps {
  /** `true` saat proses masuk OAuth sedang berjalan. */
  open: boolean;
  /** Label aktivitas, mis. "Memproses masuk...". */
  label: string;
}

/**
 * Progress ring melingkar bergaya modern untuk status memuat.
 *
 * Sengaja TIDAK memakai maskot beruang (`/images/mascot/bear-loading.gif`) —
 * GIF itu hanya dipakai oleh `LaunchScreen`. Di sini indikator dibangun murni
 * dari SVG + Framer Motion: jalur (track) redup, busur gradient yang berputar
 * terus, dan halo denyut lembut di belakangnya.
 *
 * Dipisah ke komponen sendiri agar mudah dipakai ulang dan tidak menambah
 * kerumitan pada overlay.
 */
function GlowingProgressRing() {
  const size = 72;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  /** Panjang busur yang terlihat — sisanya kosong agar terasa "berjalan". */
  const arc = circumference * 0.28;

  return (
    <span
      aria-hidden="true"
      className="relative flex h-[72px] w-[72px] items-center justify-center"
    >
      {/* Halo denyut lembut di belakang ring. */}
      <motion.span
        className="absolute inset-1 rounded-full bg-indigo-500/30 blur-md"
        initial={{ scale: 0.85, opacity: 0.35 }}
        animate={{ scale: [0.85, 1.15, 0.85], opacity: [0.35, 0.14, 0.35] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Ring berputar: diputar pada elemen HTML agar transform-origin pasti tengah. */}
      <motion.span
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
      >
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="h-full w-full drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]"
        >
          <defs>
            <linearGradient id="oauth-ring" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>

          {/* Jalur latar (track) — redup, memberi kesan ring utuh. */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            className="stroke-indigo-100"
          />

          {/* Busur gradient yang berjalan di atas track. */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            stroke="url(#oauth-ring)"
            strokeDasharray={`${arc} ${circumference - arc}`}
          />
        </svg>
      </motion.span>
    </span>
  );
}

/**
 * Modal mengambang saat proses OAuth berjalan.
 *
 * Ditampilkan lewat portal agar berada di atas seluruh layout (termasuk header
 * auth) tanpa terpotong container ber-`overflow-hidden`.
 *
 * KONTRAK ANTI-REGRESI: komponen ini TIDAK PERNAH mengimpor atau memakai ulang
 * `@/components/LaunchScreen` maupun aset `/images/mascot/bear-loading.gif`.
 * Splash maskot hanya untuk muat pertama aplikasi; indikator di sini dibangun
 * murni dari SVG + Framer Motion (lihat `GlowingProgressRing` di atas).
 *
 * KUNCI HYDRATION: overlay hanya dirender setelah `open` menjadi `true`, yang
 * selalu berasal dari interaksi pengguna di client. Render pertama (SSR & client
 * awal) selalu `open=false`, jadi tidak ada markup berbeda antara server dan
 * client. Karena itu `AnimatePresence` di sini aman dipakai.
 */
export function OAuthLoadingOverlay({ open, label }: OAuthLoadingOverlayProps) {
  // Portal butuh `document`; komponen ini hanya hidup di client setelah interaksi.
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="oauth-loading"
          role="alertdialog"
          aria-modal="true"
          aria-busy="true"
          aria-label={label}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 px-6 backdrop-blur-md"
        >
          {/* Aura indigo lembut agar kartu terasa benar-benar mengambang. */}
          <motion.span
            aria-hidden="true"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="pointer-events-none absolute h-[min(19rem,88vw)] w-[min(19rem,88vw)] rounded-full bg-indigo-500/25 blur-3xl"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 6 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            className="relative flex w-[min(17rem,80vw)] flex-col items-center gap-4 rounded-[2rem] border border-white/40 bg-white/80 px-7 py-8 shadow-2xl backdrop-blur-xl"
          >
            <GlowingProgressRing />

            <div className="space-y-1 text-center">
              <p className="text-sm font-semibold text-slate-900">{label}</p>
              <p className="text-xs text-slate-500">
                Mengalihkan ke penyedia aman...
              </p>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

