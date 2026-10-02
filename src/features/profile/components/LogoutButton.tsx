"use client";

import { useTransition } from "react";
import { Loader2, LogOut } from "lucide-react";
import { logoutAction } from "@/features/auth/actions";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  function handleLogout(): void {
    startTransition(async () => {
      await logoutAction();
    });
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isPending}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm font-medium text-rose-600 transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4" />
      )}
      <span>{isPending ? "Keluar..." : "Keluar dari Akun"}</span>
    </button>
  );
}
