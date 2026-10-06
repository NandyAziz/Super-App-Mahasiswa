import Link from "next/link";
import {
  ArrowUpRight,
  BookOpenCheck,
  Code2,
  GraduationCap,
  Printer,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CampusService {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  badgeClass: string;
  /** Kartu ke-5 dilebarkan penuh (Bento highlight). */
  featured?: boolean;
}

/**
 * Warna tema per layanan.
 *
 * `projects` memakai **purple** (bukan violet) agar identik dengan
 * `features/orders/service-meta.ts` — sebelumnya berbeda sehingga kartu yang
 * sama tampil dua nuansa ungu berbeda antara Beranda dan halaman lain.
 */
const SERVICE_THEME: Record<string, string> = {
  jastip: "bg-amber-50 text-amber-600 ring-1 ring-amber-100",
  printing: "bg-blue-50 text-blue-600 ring-1 ring-blue-100",
  projects: "bg-purple-50 text-purple-600 ring-1 ring-purple-100",
  tutoring: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100",
  academic: "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100",
};

const CAMPUS_SERVICES: CampusService[] = [
  {
    title: "Jastip Cepat",
    description: "Titip beli apa saja",
    href: "/jastip",
    icon: ShoppingBag,
    badgeClass: SERVICE_THEME.jastip,
  },
  {
    title: "Jasa Cetak",
    description: "Print & jilid dokumen",
    href: "/printing",
    icon: Printer,
    badgeClass: SERVICE_THEME.printing,
  },
  {
    title: "Proyek IT & Tugas",
    description: "Bantuan tugas coding",
    href: "/projects",
    icon: Code2,
    badgeClass: SERVICE_THEME.projects,
  },
  {
    title: "Tutor Privat",
    description: "Belajar bareng tutor",
    href: "/tutoring",
    icon: GraduationCap,
    badgeClass: SERVICE_THEME.tutoring,
  },
  {
    title: "Bantuan Akademik",
    description: "Proofreading & pendampingan laporan",
    href: "/academic",
    icon: BookOpenCheck,
    badgeClass: SERVICE_THEME.academic,
    featured: true,
  },
];

/** Kartu Bento standar (2x2 grid). */
const CARD_CLASS =
  "flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition-all duration-200 cursor-pointer hover:-translate-y-1 hover:shadow-md hover:border-indigo-200 active:scale-95";

/** Kartu Bento lebar penuh (layanan unggulan). */
const FEATURED_CARD_CLASS =
  "col-span-2 flex items-center gap-3 rounded-2xl border border-indigo-100 bg-linear-to-br from-indigo-50 to-white p-4 shadow-xs transition-all duration-200 cursor-pointer hover:-translate-y-1 hover:shadow-md hover:border-indigo-200 active:scale-95";

/**
 * Ikon layanan.
 *
 * Ukuran badge (12) dan ikon (6 → 24px) sengaja dikunci di sini agar kelima
 * kartu seragam — sebelumnya ikon hanya 20px sehingga terlihat kecil
 * dibanding badge di kartu unggulan.
 *
 * `strokeWidth` diseragamkan ke 2 agar semua ikon punya tebal garis sama.
 */
function ServiceIcon({
  icon: Icon,
  badgeClass,
}: {
  icon: LucideIcon;
  badgeClass: string;
}) {
  return (
    <span
      className={cn(
        "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
        badgeClass,
      )}
    >
      <Icon className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
    </span>
  );
}

export function HomeMenuGrid() {
  return (
    <section aria-labelledby="layanan-heading" className="shrink-0 space-y-2.5">
      <div className="flex items-center justify-between">
        <h2
          id="layanan-heading"
          className="text-sm font-semibold text-slate-900"
        >
          Layanan Kampus
        </h2>
        <span className="text-xs font-medium text-indigo-600">Semua</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {CAMPUS_SERVICES.map((service) => {
          const isFeatured = service.featured === true;

          if (isFeatured) {
            return (
              <Link
                key={service.href}
                href={service.href}
                className={FEATURED_CARD_CLASS}
              >
                <ServiceIcon
                  icon={service.icon}
                  badgeClass={service.badgeClass}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-900">
                    {service.title}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {service.description}
                  </span>
                </span>
                <ArrowUpRight className="h-5 w-5 shrink-0 text-indigo-500" />
              </Link>
            );
          }

          return (
            <Link
              key={service.href}
              href={service.href}
              className={CARD_CLASS}
            >
              <ServiceIcon icon={service.icon} badgeClass={service.badgeClass} />
              <span>
                <span className="block text-sm font-semibold text-slate-900">
                  {service.title}
                </span>
                <span className="block text-xs text-slate-500">
                  {service.description}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
