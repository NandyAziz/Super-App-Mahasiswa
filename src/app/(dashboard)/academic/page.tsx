import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getAcademicServicesAction } from "@/features/academic/actions";
import { AcademicBoard } from "@/features/academic/components/AcademicBoard";
import { AcademicForm } from "@/features/academic/components/AcademicForm";
import { AcademicSkeleton } from "@/features/academic/components/AcademicSkeleton";

export const metadata: Metadata = {
  title: "Bantuan Akademik · Campify",
};

async function AcademicHistoryLoader() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <p className="rounded-3xl border border-white/20 bg-white/70 p-6 text-center text-sm text-zinc-500 backdrop-blur-md">
        Sesi berakhir. Silakan login kembali.
      </p>
    );
  }

  const services = await getAcademicServicesAction();
  return <AcademicBoard services={services} />;
}

export default function AcademicPage() {
  return (
    <div className="flex min-h-screen flex-col gap-5 px-4 pt-5 pb-24">
      <header className="flex items-center gap-3">
        <Link
          href="/"
          aria-label="Kembali ke beranda"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/70 text-slate-600 shadow-sm backdrop-blur-md transition-all duration-200 active:scale-95"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Bantuan Akademik
          </h1>
          <p className="text-xs text-slate-500">
            Proofreading, layout &amp; sitasi, cek Turnitin, hingga bimbingan
            laporan.
          </p>
        </div>
      </header>

      <AcademicForm />

      <section
        aria-labelledby="riwayat-heading"
        className="flex flex-col gap-3"
      >
        <h2
          id="riwayat-heading"
          className="text-sm font-semibold text-slate-900"
        >
          Riwayat Pengajuan
        </h2>

        <Suspense fallback={<AcademicSkeleton />}>
          <AcademicHistoryLoader />
        </Suspense>
      </section>
    </div>
  );
}
