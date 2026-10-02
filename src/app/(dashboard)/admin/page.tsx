import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/auth";
import { fetchAdminOrders } from "@/features/admin/queries";
import { fetchProfileRole } from "@/features/profile/queries";
import { AdminDashboard } from "@/features/admin/components/AdminDashboard";
import { AdminSkeleton } from "@/features/admin/components/AdminSkeleton";

export const metadata: Metadata = {
  title: "Dashboard Operator · Campify",
};

async function AdminContent() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <p className="rounded-3xl border border-white/20 bg-white/70 p-6 text-center text-sm text-zinc-500 backdrop-blur-md">
        Sesi berakhir. Silakan login kembali.
      </p>
    );
  }

  // Guard operator: hanya profil dengan `role === "admin"` yang boleh mengakses
  // dashboard. Pengguna lain langsung dialihkan ke beranda.
  const role = await fetchProfileRole(user.id);
  if (role !== "admin") {
    redirect("/");
  }

  const { orders, overview } = await fetchAdminOrders();
  return <AdminDashboard orders={orders} overview={overview} />;
}

export default function AdminPage() {
  return (
    <div className="flex flex-col gap-5 px-5 pt-6 pb-6">
      <header>
        <h1 className="text-lg font-semibold text-zinc-900">
          Dashboard Operator
        </h1>
        <p className="text-xs text-zinc-500">
          Kelola pesanan masuk &amp; status dari 5 layanan Campify.
        </p>
      </header>

      <Suspense fallback={<AdminSkeleton />}>
        <AdminContent />
      </Suspense>
    </div>
  );
}
