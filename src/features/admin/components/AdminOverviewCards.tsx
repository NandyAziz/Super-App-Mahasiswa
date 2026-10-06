import {
  ClipboardList,
  PackageCheck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminOverview } from "../types";

interface StatDefinition {
  label: string;
  value: string;
  icon: LucideIcon;
  iconClass: string;
}

/**
 * Tiga kartu ringkasan operator: total pesanan, pesanan yang butuh tindakan,
 * dan pendapatan terkumpul. Murni presentasional agar mudah dirender server.
 */
export function AdminOverviewCards({ overview }: { overview: AdminOverview }) {
  const stats: StatDefinition[] = [
    {
      label: "Pesanan Masuk",
      value: String(overview.totalOrders),
      icon: ClipboardList,
      iconClass: "bg-indigo-100 text-indigo-600",
    },
    {
      label: "Butuh Tindakan",
      value: String(overview.needsAction),
      icon: PackageCheck,
      iconClass: "bg-amber-100 text-amber-600",
    },
    {
      label: "Pendapatan QRIS",
      value: overview.revenueLabel,
      icon: Wallet,
      iconClass: "bg-emerald-100 text-emerald-600",
    },
  ];

  return (
    <section aria-label="Ringkasan operator" className="grid grid-cols-3 gap-2">
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <div
            key={stat.label}
            className="rounded-2xl border border-white/20 bg-white/70 p-3 shadow-sm backdrop-blur-md transition-all duration-200 hover:border-indigo-200/70 hover:shadow-md"
          >
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl",
                stat.iconClass,
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <p className="mt-2 truncate text-sm font-bold text-zinc-900">
              {stat.value}
            </p>
            <p className="mt-0.5 text-[0.65rem] leading-tight font-medium text-zinc-500">
              {stat.label}
            </p>
          </div>
        );
      })}
    </section>
  );
}
