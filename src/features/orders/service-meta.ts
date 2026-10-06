import {
  BookOpenCheck,
  Code2,
  GraduationCap,
  Printer,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import type { OrderService } from "./types";

export interface OrderServiceMeta {
  label: string;
  icon: LucideIcon;
  /** Kelas Tailwind latar pastel kategori layanan (dipakai ikon & aksen). */
  tint: string;
  badge: string;
}

const SERVICE_META: Record<string, OrderServiceMeta> = {
  jastip: {
    label: "Jastip",
    icon: ShoppingBag,
    tint: "bg-amber-50 border border-amber-200/60 text-amber-600",
    badge: "border-amber-100 bg-amber-50 text-amber-700",
  },
  printing: {
    label: "Cetak",
    icon: Printer,
    tint: "bg-blue-50 border border-blue-200/60 text-blue-600",
    badge: "border-blue-100 bg-blue-50 text-blue-700",
  },
  projects: {
    label: "IT Project",
    icon: Code2,
    tint: "bg-purple-50 border border-purple-200/60 text-purple-600",
    badge: "border-purple-100 bg-purple-50 text-purple-700",
  },
  tutoring: {
    label: "Tutor",
    icon: GraduationCap,
    tint: "bg-emerald-50 border border-emerald-200/60 text-emerald-600",
    badge: "border-emerald-100 bg-emerald-50 text-emerald-700",
  },
  academic: {
    label: "Akademik",
    icon: BookOpenCheck,
    tint: "bg-indigo-50 border border-indigo-200/60 text-indigo-600",
    badge: "border-indigo-100 bg-indigo-50 text-indigo-700",
  },
};

/** Aman walau database mengembalikan layanan di luar yang dikenal UI. */
export function getOrderServiceMeta(service: OrderService): OrderServiceMeta {
  return SERVICE_META[service] ?? SERVICE_META.jastip;
}
