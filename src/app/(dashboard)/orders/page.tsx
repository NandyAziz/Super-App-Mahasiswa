import { Suspense } from "react";
import type { Metadata } from "next";
import { fetchOrderSummaries } from "@/features/orders/queries";
import { OrdersBoard } from "@/features/orders/components/OrdersBoard";
import { OrdersSkeleton } from "@/features/orders/components/OrdersSkeleton";

export const metadata: Metadata = {
  title: "Pesanan Saya · Campify",
};

async function OrdersBoardLoader() {
  const orders = await fetchOrderSummaries();
  return <OrdersBoard orders={orders} />;
}

export default function OrdersPage() {
  return (
    <div className="flex flex-col gap-5 px-5 pt-6 pb-6">
      <header>
        <h1 className="text-lg font-semibold text-zinc-900">Pesanan Saya</h1>
        <p className="text-xs text-zinc-500">
          Semua transaksi dari 5 layanan Campify dalam satu tempat.
        </p>
      </header>

      <Suspense fallback={<OrdersSkeleton />}>
        <OrdersBoardLoader />
      </Suspense>
    </div>
  );
}
