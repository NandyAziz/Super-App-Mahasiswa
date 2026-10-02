import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { fetchOrderDetail } from "@/features/orders/queries";
import { OrderDetailPanel } from "@/features/orders/components/OrderDetailPanel";
import { OrderDetailSkeleton } from "@/features/orders/components/OrderDetailSkeleton";

export const metadata: Metadata = {
  title: "Detail Pesanan · Campify",
};

async function OrderDetailLoader({ orderId }: { orderId: string }) {
  const order = await fetchOrderDetail(orderId);
  return <OrderDetailPanel order={order} />;
}

interface OrderDetailPageProps {
  /** Next.js 16: `params` bersifat async dan wajib di-await. */
  params: Promise<{ orderId: string }>;
}

export default async function OrderDetailPage({
  params,
}: OrderDetailPageProps) {
  const { orderId } = await params;

  return (
    <div className="flex flex-col gap-5 px-5 pt-6 pb-6">
      <header className="flex items-center gap-3">
        <Link
          href="/orders"
          aria-label="Kembali ke Pesanan"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/70 text-zinc-600 backdrop-blur-md transition-all duration-200 active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">
            Detail Pesanan
          </h1>
          <p className="text-xs text-zinc-500">
            Ringkasan transaksi & status pembayaran.
          </p>
        </div>
      </header>

      <Suspense fallback={<OrderDetailSkeleton />}>
        <OrderDetailLoader orderId={orderId} />
      </Suspense>
    </div>
  );
}