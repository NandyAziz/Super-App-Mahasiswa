import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

/**
 * Pintasan menuju dashboard operator (`/admin`). Hanya dirender untuk pengguna
 * dengan `profile.role === "admin"`.
 */
export function AdminShortcut() {
  return (
    <Link
      href="/admin"
      className="flex items-center justify-between gap-3 rounded-xl bg-indigo-600 px-4 py-3.5 text-white shadow-sm transition-colors duration-200 hover:bg-indigo-700 active:scale-95"
    >
      <span className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-sm font-semibold">
            Operator Dashboard
          </span>
          <span className="block text-[0.7rem] text-white/80">
            Kelola pesanan &amp; status 5 layanan Campify
          </span>
        </span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0" />
    </Link>
  );
}
