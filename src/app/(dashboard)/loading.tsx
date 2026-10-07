"use client";
;
import { Suspense } from "react";
;
/**
 * Skeleton default untuk seluruh dashboard — placeholder saat route berubah.
 * Menyembunyikan flash cold-start saat serverless memaksa isi halaman.
 */

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-5 px-4 pt-5 pb-28">
      <div className="h-8 w-40 rounded-lg bg-slate-200/70"></div>
      <div className="h-40 w-full rounded-2xl border border-white/20 bg-white/70"></div>
      <div className="grid grid-cols-2 gap-3 mt-5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-white/20 bg-white/70 p-4">
            <div className="h-10 w-10 rounded-xl bg-slate-200/70"></div>
            <div className="h-3 w-3/4 mt-3 rounded bg-slate-200/70"></div>
            <div className="h-2.5 w-1/2 mt-2 rounded bg-slate-200/70"></div>
            <div className="h-8 w-full rounded-2xl mt-3 bg-slate-200/70"></div>
          </div>
        ))}
      </div>
      <div className="h-40 w-full rounded-2xl border border-white/20 bg-white/70 mt-5"></div>
    </div>
  );
}