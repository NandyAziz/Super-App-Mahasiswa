import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, PackageSearch, ShieldAlert } from "lucide-react";
import { PublicTrackForm } from "@/features/tracking/components/PublicTrackForm";
import { PublicTrackSkeleton } from "@/features/tracking/components/PublicTrackSkeleton";
import { PublicTrackStatusCard } from "@/features/tracking/components/PublicTrackStatusCard";
import { fetchPublicOrderTracking } from "@/features/tracking/public-queries";
import { publicTrackOrderSchema } from "@/features/tracking/schemas";

export const metadata: Metadata = {
  title: "Lacak Pesanan · Campify",
  description:
    "Lacak status pesanan Campify tanpa perlu masuk akun — cukup tempel ID pesanan atau tautannya.",
};

/** Pengambil data di balik `<Suspense>` agar skeleton tampil saat menunggu. */
async function TrackResultLoader({ orderId }: { orderId: string }) {
  const order = await fetchPublicOrderTracking(orderId);
  return <PublicTrackStatusCard order={order} />;
}

interface TrackPageProps {
  /** Next.js 16: `searchParams` adalah Promise dan wajib di-await. */
  searchParams: Promise<{ id?: string | string[] }>;
}

/**
 * Halaman pelacakan tamu (`/track`) — publik, tanpa sesi.
 *
 * Hasil berada di URL (`?id=<uuid>`) sehingga bisa dibagikan, dan seluruh
 * pembacaan tetap dijalankan di server lewat RPC yang hanya mengembalikan
 * kolom aman-publik.
 */
export default async function TrackPage({ searchParams }: TrackPageProps) {
  const { id } = await searchParams;
  const rawId = typeof id === "string" ? id : "";
  const hasQuery = rawId.trim().length > 0;
  const parsed = publicTrackOrderSchema.safeParse({ orderId: rawId });
  const orderId = parsed.success ? parsed.data.orderId : null;
  const invalidMessage =
    hasQuery && !parsed.success
      ? (parsed.error.issues[0]?.message ?? "ID pesanan tidak valid.")
      : null;

  return (
    <div className="flex flex-col gap-5 px-5 pt-6 pb-8">
      <header className="flex items-center gap-3">
        <Link
          href="/login"
          aria-label="Kembali ke halaman masuk"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/70 text-zinc-600 backdrop-blur-md transition-all duration-200 active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Lacak Pesanan</h1>
          <p className="text-xs text-zinc-500">
            Pantau status pesanan tanpa perlu masuk akun.
          </p>
        </div>
      </header>

      <PublicTrackForm initialOrderId={rawId} />

      {invalidMessage ? (
        <div className="flex items-start gap-3 rounded-3xl border border-amber-200 bg-amber-50/80 p-4">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              ID pesanan tidak dikenali
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-amber-700">
              {invalidMessage}
            </p>
          </div>
        </div>
      ) : null}

      {!hasQuery ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-zinc-200 bg-white/60 px-6 py-10 text-center backdrop-blur-md">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
            <PackageSearch className="h-6 w-6" />
          </span>
          <p className="text-sm font-semibold text-zinc-700">
            Masukkan ID pesanan
          </p>
          <p className="text-xs leading-relaxed text-zinc-500">
            Tempel ID atau tautan pesanan yang kamu terima untuk melihat status
            terbaru — tanpa perlu akun Campify.
          </p>
        </div>
      ) : null}

      {orderId ? (
        <Suspense key={orderId} fallback={<PublicTrackSkeleton />}>
          <TrackResultLoader orderId={orderId} />
        </Suspense>
      ) : null}
    </div>
  );
}
