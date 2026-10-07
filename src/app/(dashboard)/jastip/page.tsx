import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getJastipOrdersAction } from "@/features/jastip/actions";
import { resolveFreeShippingStatus } from "@/features/orders/free-shipping";
import { countPastOrdersForFreeShipping } from "@/features/orders/free-shipping-queries";
import { resolveJastipPromo } from "@/features/promos/eligibility";
import { JastipBoard } from "@/features/jastip/components/JastipBoard";
import { JastipSkeleton } from "@/features/jastip/components/JastipSkeleton";
import { WeatherBadge } from "@/features/weather/components/WeatherBadge";
import { fetchWeatherBadge } from "@/lib/weather";

export const metadata: Metadata = {
  title: "Jastip Cepat · Campify",
};

interface JastipPageProps {
  /**
   * Next.js 16: `searchParams` adalah Promise dan wajib di-await.
   * Berisi `?promo=LOYALTY3RD` atau `?promo=PATUNGAN` saat pengguna datang
   * dari PromoCarousel di beranda.
   */
  searchParams: Promise<{ promo?: string }>;
}

async function JastipBoardLoader({ promo }: { promo: string | undefined }) {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <p className="rounded-3xl border border-white/20 bg-white/70 p-6 text-center text-sm text-zinc-500 backdrop-blur-md">
        Sesi berakhir. Silakan login kembali.
      </p>
    );
  }

  const orders = await getJastipOrdersAction();

  // Promo diverifikasi ulang di server (bukan dari URL mentah): kelayakan
  // loyalitas butuh jumlah transaksi sebelumnya dari database.
  const appliedPromo = await resolveJastipPromo(promo, user.id);

  // Bebas ongkir otomatis (tanpa kode): hitung riwayat lintas layanan agar
  // pratinjau form memakai angka yang sama dengan Server Action.
  const pastOrderCount = await countPastOrdersForFreeShipping(user.id);
  const freeShipping = resolveFreeShippingStatus(pastOrderCount);

  return (
    <JastipBoard
      currentUserId={user.id}
      orders={orders}
      appliedPromo={appliedPromo}
      freeShipping={freeShipping}
    />
  );
}

export default async function JastipPage({ searchParams }: JastipPageProps) {
  const [{ promo }, weather] = await Promise.all([
    searchParams,
    fetchWeatherBadge(),
  ]);

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
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold text-zinc-900">Jastip Cepat</h1>
          <p className="text-xs text-zinc-500">
            Titip beli &amp; antar ke lokasi kampus.
          </p>
        </div>
        <WeatherBadge initial={weather} />
      </header>

      <Suspense fallback={<JastipSkeleton />}>
        <JastipBoardLoader promo={promo} />
      </Suspense>
    </div>
  );
}
