import { Suspense } from "react";
import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/auth";
import { fetchAdminOrders } from "@/features/admin/queries";
import { fetchProfileRole } from "@/features/profile/queries";
import { AdminDashboard } from "@/features/admin/components/AdminDashboard";
import { AdminSkeleton } from "@/features/admin/components/AdminSkeleton";
import { AdminHeaderBell } from "@/features/admin/components/AdminHeaderBell";

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
      {/*
        Header operator: lencana peran + bell notifikasi pesan baru.
        `NotificationBell` yang sama dipakai Header utama — realtime
        `INSERT` pada `notifications` milik admin menambah badge instan.
      */}
      <header className="flex items-center justify-between gap-3 rounded-3xl border border-white/20 bg-white/70 p-4 shadow-sm backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm shadow-indigo-500/30">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-zinc-900">
              Dashboard Operator
            </h1>
            <p className="truncate text-xs text-zinc-500">
              Kelola pesanan masuk &amp; status dari 5 layanan Campify.
            </p>
          </div>
        </div>

        <Suspense
          fallback={
            <span className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-slate-100" />
          }
        >
          <AdminHeaderBell />
        </Suspense>
      </header>

      <Suspense fallback={<AdminSkeleton />}>
        <AdminContent />
      </Suspense>
    </div>
  );
}
