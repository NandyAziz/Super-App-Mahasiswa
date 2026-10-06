import { Suspense } from "react";
import type { Metadata } from "next";
import { fetchOrderSummaries } from "@/features/orders/queries";
import { OrdersBoard } from "@/features/orders/components/OrdersBoard";
import { OrderChatLinkCard } from "@/features/orders/components/OrderChatLinkCard";
import { OrdersSkeleton } from "@/features/orders/components/OrdersSkeleton";

export const metadata: Metadata = {
  title: "Pesanan Saya · Campify",
};

/**
 * Header halaman — murni presentasional, tanpa logika data.
 */
function OrdersHeader({ total }: { total: number }) {
  return (
    <header className="rounded-2xl border border-white/20 bg-white/70 p-5 shadow-sm backdrop-blur-md">
      <h1 className="text-base font-semibold text-zinc-900">Pesanan Saya</h1>
      <p className="mt-0.5 text-xs text-zinc-500">
        {total > 0
          ? `${total} transaksi dari 5 layanan Campify dalam satu tempat.`
          : "Semua transaksi dari 5 layanan Campify dalam satu tempat."}
      </p>
    </header>
  );
}

async function OrdersBoardLoader() {
  // Kontrak data tidak berubah: tetap satu read-model ringkas.
  const orders = await fetchOrderSummaries();
  return (
    <>
      <OrdersHeader total={orders.length} />
      {/*
        Kartu tautan chat per pesanan — murni navigasi visual ke
        `/orders/[orderId]` tempat `ChatSection` berada.
      */}
      <OrderChatLinkCard orders={orders} />
      <OrdersBoard orders={orders} />
    </>
  );
}

export default function OrdersPage() {
  return (
    <div className="flex flex-col gap-5 px-5 pt-6 pb-6">
      <Suspense
        fallback={
          <>
            <OrdersHeader total={0} />
            <OrdersSkeleton />
          </>
        }
      >
        <OrdersBoardLoader />
      </Suspense>
    </div>
  );
}
