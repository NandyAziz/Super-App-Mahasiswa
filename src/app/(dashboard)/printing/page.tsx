import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Printer } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getPrintOrdersAction } from "@/features/printing/actions";
import { resolveFreeShippingStatus } from "@/features/orders/free-shipping";
import { countPastOrdersForFreeShipping } from "@/features/orders/free-shipping-queries";
import { resolvePrintPromo } from "@/features/promos/eligibility";
import { PrintBoard } from "@/features/printing/components/PrintBoard";
import { PrintSkeleton } from "@/features/printing/components/PrintSkeleton";

export const metadata: Metadata = {
  title: "Jasa Cetak · Campify",
};

/** Alur perantara cetak: Campify menjadi perantara fotokopi & pengantar. */
const PRINT_STEPS = [
  "Unggah dokumen — Tim Campify akan mencetakkannya di fotokopi terdekat.",
  "Isi nomor WhatsApp & lokasi antar agar Tim Campify mudah menghubungi kamu.",
  "Tentukan jumlah salinan yang dibutuhkan.",
  "Tim Campify mengantar hasil cetak ke lokasi kamu.",
] as const;

interface PrintingPageProps {
  /**
   * Next.js 16: `searchParams` adalah Promise dan wajib di-await.
   * Berisi `?promo=PAKET_SKRIPSI` saat pengguna datang dari PromoCarousel.
   */
  searchParams: Promise<{ promo?: string }>;
}

function ServiceSteps() {
  return (
    <section className="rounded-2xl border border-white/20 bg-white/70 p-4 shadow-sm backdrop-blur-md">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
          <Printer className="h-4 w-4" />
        </span>
        <h2 className="text-sm font-semibold text-zinc-900">
          Cara Pesan Cetak
        </h2>
      </div>

      <ol className="space-y-2 text-xs text-zinc-600">
        {PRINT_STEPS.map((step, index) => (
          <li key={step} className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[0.7rem] font-semibold text-indigo-600">
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      <p className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[0.7rem] leading-relaxed font-medium text-amber-700">
        Opsi cetak (warna, ukuran kertas, finishing) &amp; total harga
        dikonfirmasi Tim Campify via WhatsApp sebelum dicetak di fotokopi.
      </p>
    </section>
  );
}

async function PrintBoardLoader({ promo }: { promo: string | undefined }) {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <p className="rounded-3xl border border-white/20 bg-white/70 p-6 text-center text-sm text-zinc-500 backdrop-blur-md">
        Sesi berakhir. Silakan login kembali.
      </p>
    );
  }

  const orders = await getPrintOrdersAction();

  // Promo Cetak diverifikasi ulang di server; kode asing / promo milik
  // layanan lain otomatis diabaikan.
  const appliedPromo = await resolvePrintPromo(promo);

  // Bebas ongkir otomatis (tanpa kode): hitung riwayat lintas layanan agar
  // pratinjau form memakai angka yang sama dengan Server Action.
  const pastOrderCount = await countPastOrdersForFreeShipping(user.id);
  const freeShipping = resolveFreeShippingStatus(pastOrderCount);

  return <PrintBoard orders={orders} appliedPromo={appliedPromo} freeShipping={freeShipping} />;
}

export default async function PrintingPage({ searchParams }: PrintingPageProps) {
  const { promo } = await searchParams;

  return (
    <div className="flex flex-col gap-5 px-5 pt-6 pb-28">
      <header className="flex items-center gap-3">
        <Link
          href="/"
          aria-label="Kembali ke beranda"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/70 text-zinc-600 shadow-sm backdrop-blur-md transition-all duration-200 active:scale-95"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">
            Layanan Cetak Dokumen
          </h1>
          <p className="text-xs text-zinc-500">
            Unggah dokumen, kami cetak di fotokopi terdekat lalu antarkan ke
            kamu.
          </p>
        </div>
      </header>

      <ServiceSteps />

      <Suspense fallback={<PrintSkeleton />}>
        <PrintBoardLoader promo={promo} />
      </Suspense>
    </div>
  );
}
