import { JASTIP_BASE_FEE } from "@/lib/pricing";

/**
 * =============================================================================
 * Campify — Katalog Promo
 * =============================================================================
 * Satu-satunya sumber kebenaran untuk kode promo, label badge, dan aturan
 * biorekannya. Dipakai bersama oleh:
 *   - `PromoCarousel` (kartu promo beranda) untuk `href` — supaya link dan
 *     kode promo tidak pernah berbeda,
 *   - `/jastip` & `/printing` untuk badge + pratinjau ongkir,
 *   - Server Action untuk menghitung ulang nominal (sumber kebenaran).
 *
 * Murni & aman dipakai di server maupun client (tanpa import server-only),
 * sehingga pratinjau di form memakai rumus yang PERSIS sama dengan yang
 * dijalankan Server Action — tidak ada risiko angka berbeda.
 * =============================================================================
 */

export const PROMO_CODES = ["LOYALTY3RD", "PAKET_SKRIPSI", "PATUNGAN"] as const;

export type PromoCode = (typeof PROMO_CODES)[number];

/** Layanan yang menerima promo tertentu. */
export type PromoService = "jastip" | "printing";

/**
 * Bentuk efek promo terhadap ongkir.
 * - `free_delivery`  → ongkir menjadi 0.
 * - `flat_delivery`  → ongkir dibatasi pada tarif dasar (tidak ikut jarak/sibuk).
 * - `claim_only`     → tidak mengubah ongkir; klaim dikonfirmasi manual.
 */
export type PromoEffect = "free_delivery" | "flat_delivery" | "claim_only";

export interface PromoDefinition {
  code: PromoCode;
  /** Layanan yang menerima promo ini. */
  service: PromoService;
  /** Badge yang ditampilkan pada form. */
  badge: string;
  /** Ringkasan aturan, dipakai sebagai catatan di form. */
  summary: string;
  /** Efek terhadap nominal ongkir. */
  effect: PromoEffect;
  /**
   * Catatan yang harus disampaikan ke tim lewat WhatsApp / `custom_note`.
   * Hanya terisi untuk promo ber-efek `claim_only`, yang biayanya dihitung
   * di luar aplikasi sehingga tidak bisa dipotong otomatis.
   */
  claimNote: string | null;
}

/** Tiap N transaksi pengguna mendapat ongkir gratis (kode ke-3, ke-6, ...). */
export const LOYALTY_FREE_EVERY = 3;

export const PROMO_DEFINITIONS: Record<PromoCode, PromoDefinition> = {
  LOYALTY3RD: {
    code: "LOYALTY3RD",
    service: "jastip",
    badge: "PROGRAM LOYALITAS",
    summary: `Ongkir gratis setiap ${LOYALTY_FREE_EVERY} transaksi (transaksi ke-${LOYALTY_FREE_EVERY}, ke-${LOYALTY_FREE_EVERY * 2}, dst).`,
    effect: "free_delivery",
    claimNote: null,
  },
  PAKET_SKRIPSI: {
    code: "PAKET_SKRIPSI",
    service: "printing",
    badge: "PAKET SKRIPSI & TUGAS",
    summary:
      "Diskon 15% untuk cetakan > 50 halaman (laporan & jilid tebal).",
    effect: "claim_only",
    claimNote:
      "[PAKET SKRIPSI] Diskon 15% untuk cetakan > 50 halaman. Mohon konfirmasi jumlah halaman via WhatsApp.",
  },
  PATUNGAN: {
    code: "PATUNGAN",
    service: "jastip",
    badge: "PATUNGAN KELAS",
    summary: "Ongkir flat — biaya tambahan jarak & jam sibuk tidak dihitung.",
    effect: "flat_delivery",
    claimNote: null,
  },
};

/**
 * Halaman tujuan promo. Dipakai `PromoCarousel` sebagai `href` agar kartu
 * di beranda dan logika promo tidak pernah keluar sinkron.
 */
export const PROMO_HREFS: Record<PromoCode, string> = {
  LOYALTY3RD: "/jastip?promo=LOYALTY3RD",
  PAKET_SKRIPSI: "/printing?promo=PAKET_SKRIPSI",
  PATUNGAN: "/jastip?promo=PATUNGAN",
};

/** Promo yang sudah tervalidasi & layak, siap ditampilkan di form. */
export interface AppliedPromo {
  code: PromoCode;
  badge: string;
  summary: string;
  /**
   * Instruksi yang harus ikut dikirim ke tim (isi `custom_note`).
   * Null bila promo sudah langsung memotong ongkir di server.
   */
  claimNote: string | null;
}

export interface JastipFeeResolution {
  /** Ongkir akhir yang dipersist ke `delivery_tip`. */
  total: number;
  /** Ongkir tanpa promo — dipakai menampilkan besaran penghematan. */
  originalTotal: number;
  /** Promo yang benar-benar terpakai; null bila tidak ada / tidak eligible. */
  promo: AppliedPromo | null;
}

/** Ubah definisi katalog menjadi bentuk yang dipakai form. */
export function toAppliedPromo(code: PromoCode): AppliedPromo {
  const definition = PROMO_DEFINITIONS[code];

  return {
    code: definition.code,
    badge: definition.badge,
    summary: definition.summary,
    claimNote: definition.claimNote,
  };
}

/**
 * Rumus(onGkir tanpa promo) → (ongkir akhir). **Fungsi murni & deterministik**
 * yang dipakai PERSIS sama oleh pratinjau client dan Server Action.
 *
 * `eligible` sengaja jadi parameter terpisah dari `code` supaya client tidak
 * pernah memutuskan kelayakan sendiri — kelayakan dihitung di server
 * (lihat `eligibility.ts`) lalu dikirim sebagai "promo sudah terverifikasi".
 */
export function resolveJastipFeeTotal(
  code: PromoCode | null,
  originalTotal: number,
  eligible: boolean,
): JastipFeeResolution {
  const untouched: JastipFeeResolution = {
    total: originalTotal,
    originalTotal,
    promo: null,
  };

  if (!code || !eligible) {
    return untouched;
  }

  const definition = PROMO_DEFINITIONS[code];

  if (definition.effect === "free_delivery") {
    return { total: 0, originalTotal, promo: toAppliedPromo(code) };
  }

  if (definition.effect === "flat_delivery") {
    const flat = Math.min(originalTotal, JASTIP_BASE_FEE);

    return flat < originalTotal
      ? { total: flat, originalTotal, promo: toAppliedPromo(code) }
      : untouched;
  }

  return untouched;
}
