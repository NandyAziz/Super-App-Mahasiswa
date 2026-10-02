import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getJastipOrdersAction } from "@/features/jastip/actions";
import { JastipBoard } from "@/features/jastip/components/JastipBoard";
import { JastipSkeleton } from "@/features/jastip/components/JastipSkeleton";

export const metadata: Metadata = {
  title: "Jastip Cepat · Campify",
};

async function JastipBoardLoader() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <p className="rounded-3xl border border-white/20 bg-white/70 p-6 text-center text-sm text-zinc-500 backdrop-blur-md">
        Sesi berakhir. Silakan login kembali.
      </p>
    );
  }

  const orders = await getJastipOrdersAction();
  return <JastipBoard currentUserId={user.id} orders={orders} />;
}

export default function JastipPage() {
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
          <h1 className="text-lg font-semibold text-zinc-900">Jastip Cepat</h1>
          <p className="text-xs text-zinc-500">
            Titip beli &amp; antar ke lokasi kampus.
          </p>
        </div>
      </header>

      <Suspense fallback={<JastipSkeleton />}>
        <JastipBoardLoader />
      </Suspense>
    </div>
  );
}
