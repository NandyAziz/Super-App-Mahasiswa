import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Printer } from "lucide-react";
import { formatRupiah } from "@/lib/format";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getPrintOrdersAction } from "@/features/printing/actions";
import { PrintBoard } from "@/features/printing/components/PrintBoard";
import { PrintSkeleton } from "@/features/printing/components/PrintSkeleton";
import {
  BINDING_OPTIONS,
  PRINT_TYPE_OPTIONS,
} from "@/features/printing/pricing";

export const metadata: Metadata = {
  title: "Jasa Cetak · Campify",
};

function PriceSummary() {
  return (
    <section className="rounded-3xl border border-white/20 bg-white/70 p-4 shadow-sm backdrop-blur-md">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
          <Printer className="h-4 w-4" />
        </span>
        <h2 className="text-sm font-semibold text-zinc-900">Daftar Harga</h2>
      </div>

      <ul className="space-y-1.5 text-xs text-zinc-600">
        {PRINT_TYPE_OPTIONS.map((option) => (
          <li key={option.value} className="flex items-center justify-between">
            <span>Cetak {option.label}</span>
            <span className="font-semibold text-zinc-800">
              {formatRupiah(option.pricePerPage)}/lembar
            </span>
          </li>
        ))}

        {BINDING_OPTIONS.filter((option) => option.price > 0).map((option) => (
          <li key={option.value} className="flex items-center justify-between">
            <span>Jilid {option.label}</span>
            <span className="font-semibold text-zinc-800">
              +{formatRupiah(option.price)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

async function PrintBoardLoader() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <p className="rounded-3xl border border-white/20 bg-white/70 p-6 text-center text-sm text-zinc-500 backdrop-blur-md">
        Sesi berakhir. Silakan login kembali.
      </p>
    );
  }

  const orders = await getPrintOrdersAction();
  return <PrintBoard orders={orders} />;
}

export default function PrintingPage() {
  return (
    <div className="flex flex-col gap-5 px-5 pt-6 pb-24">
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
            Unggah link dokumen, ambil hasil cetak di kampus.
          </p>
        </div>
      </header>

      <PriceSummary />

      <Suspense fallback={<PrintSkeleton />}>
        <PrintBoardLoader />
      </Suspense>
    </div>
  );
}
