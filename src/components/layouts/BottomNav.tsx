"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Home, Inbox, User, type LucideIcon } from "lucide-react";
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

function isItemActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed bottom-3 left-0 right-0 z-50 mx-auto max-w-md px-4"
    >
      <ul className="flex items-center justify-around rounded-2xl border border-slate-200/60 bg-white/85 px-6 py-2.5 shadow-xl backdrop-blur-md">
        {NAV_ITEMS.map((item) => {
          const active = isItemActive(pathname, item.href);
          const Icon = item.icon;

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl py-1 text-[0.65rem] font-medium",
                  "transition-all duration-200 active:scale-95",
                  active
                    ? "text-indigo-600"
                    : "text-slate-400 hover:text-slate-600",
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
