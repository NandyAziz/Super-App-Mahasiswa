"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import {
  ClipboardList,
  Home,
  Inbox,
  User,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Orders", href: "/orders", icon: ClipboardList },
  { label: "Inbox", href: "/inbox", icon: Inbox },
  { label: "Profile", href: "/profile", icon: User },
];

/** Subscribe kosong — nilai mount tidak pernah berubah selama satu sesi. */
const subscribeToNothing = () => () => {};

/**
 * Gerbang hydration (pola sama dengan `PromoCarousel`): `false` saat SSR,
 * `true` setelah hydration. Semua animasi hanya aktif setelah ini sehingga
 * Framer Motion tidak menyuntik inline style saat render server.
 */
function useHasMounted(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
}

function isItemActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/**
 * Rute yang TIDAK memakai navigasi bawah milik pengguna.
 *
 * Panel `/admin` adalah alat operator (tabel lebar + peta navigasi) sehingga
 * bottom bar akan menutupi konten dan area aksi tabel di layar HP.
 * Header admin sudah menyediakan lonceng notifikasi sendiri.
 */
function isOperatorRoute(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

/**
 * Tab bar bawah yang menempel tetap (fixed) seperti aplikasi native.
 *
 * - Posisi `fixed` + `pb-safe` (safe-area iOS) + kotak kaca (glassmorphism).
 * - Item aktif ditandai pil beranimasi (`layoutId`) yang meluncur antar tab,
 *   plus ikon yang sedikit membesar — mirip tab bar aplikasi asli.
 * - Animasi dikunci `initial={false}` + gerbang `hasMounted` agar render server
 *   dan render pertama client identik (tidak ada hydration mismatch).
 */
export function BottomNav() {
  const pathname = usePathname();
  const hasMounted = useHasMounted();

  if (isOperatorRoute(pathname)) {
    return null;
  }

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md px-4 pb-safe"
    >
      <ul className="flex items-center justify-around gap-1 rounded-3xl border border-white/20 bg-white/70 px-3 pt-1.5 shadow-xl backdrop-blur-md">
        {NAV_ITEMS.map((item) => {
          const active = isItemActive(pathname, item.href);
          const Icon = item.icon;

          return (
            <li key={item.href} className="relative flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[0.65rem] font-medium",
                  "transition-all duration-200 active:scale-95",
                  active ? "text-indigo-600" : "text-slate-400",
                )}
              >
                {/* Pil latar aktif yang meluncur halus antar tab. */}
                {active && hasMounted ? (
                  <motion.span
                    layoutId="bottom-nav-active-pill"
                    initial={false}
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    className="absolute inset-x-1 inset-y-0 -z-10 rounded-2xl bg-indigo-50"
                  />
                ) : null}

                <motion.span
                  initial={false}
                  animate={
                    hasMounted ? { scale: active ? 1.1 : 1 } : undefined
                  }
                  transition={{ type: "spring", stiffness: 400, damping: 26 }}
                  className="flex"
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                </motion.span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

