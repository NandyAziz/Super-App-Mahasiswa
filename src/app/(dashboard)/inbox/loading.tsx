"use client";

import { Suspense } from "react";

/**
 * Skeleton halaman — fallback saat data loading (cold start).
 */
export default function InboxLoading() {
  return (
    <div className="flex flex-col gap-5 px-5 pt-6 pb-28">
      <div className="h-8 w-32 rounded-lg bg-slate-200/70"></div>
      <div className="h-40 w-full rounded-2xl border border-white/20 bg-white/70"></div>
      <div className="grid grid-cols-1 gap-4 mt-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-white/20 bg-white/70 p-4">
            <div className="h-10 w-10 rounded-xl bg-slate-200/70"></div>
            <div className="h-3 w-3/4 mt-3 rounded bg-slate-200/70"></div>
            <div className="h-2.5 w-20 rounded bg-slate-200/70"></div>
            <div className="h-6 w-full rounded-xl mt-3 bg-slate-200/70"></div>
            <div className="h-6 w-full rounded-xl mt-2 bg-slate-200/70"></div>
          </div>
        ))}
      </div>
    </div>
  );
}