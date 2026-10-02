"use client";

import { useState, type MouseEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  DEFAULT_REDIRECT_PATH,
  OAUTH_CALLBACK_PATH,
  type OAuthProvider,
} from "../constants";

const PROVIDER_LABEL: Record<OAuthProvider, string> = {
  google: "Google",
  github: "GitHub",
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.9-.1-1.5-.3-2.3H12v4.5h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.1.1 3.5 2.7.2.1c2.2-2 3.4-5 3.4-8.9z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5l-.1.1-3.6 2.8-.1.1C3.4 21.5 7.4 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-.1-.1-3.6-2.8-.1.1C.5 8.5 0 10.2 0 12s.5 3.5 1.4 5.1l3.8-2.7z"
      />
      <path
        fill="#EA4335"
        d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.4 0 3.4 2.5 1.4 6.8l3.8 2.9c1-2.9 3.7-5 6.8-5z"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-slate-900" aria-hidden="true">
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.05-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.39 1.24-3.23-.13-.3-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.25 2.88.12 3.18.77.84 1.24 1.92 1.24 3.23 0 4.62-2.81 5.64-5.49 5.94.43.37.81 1.1.81 2.22 0 1.6-.01 2.9-.01 3.29 0 .32.21.7.82.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-slate-900" aria-hidden="true">
      <path d="M17.05 12.54c0-2.4 1.96-3.55 2.05-3.6-1.12-1.64-2.86-1.86-3.48-1.89-1.48-.15-2.89.87-3.64.87-.75 0-1.9-.85-3.13-.83-1.61.02-3.1.94-3.93 2.38-1.68 2.9-.43 7.2 1.2 9.56.8 1.16 1.76 2.46 3.02 2.41 1.21-.05 1.67-.78 3.13-.78s1.87.78 3.15.76c1.3-.02 2.12-1.18 2.91-2.35.92-1.34 1.3-2.64 1.32-2.71-.03-.01-2.54-.98-2.6-3.82zM14.16 4.06c.66-.8 1.1-1.91.98-3.02-.95.04-2.1.63-2.78 1.43-.61.7-1.15 1.83-1 2.9 1.06.08 2.14-.54 2.8-1.31z" />
    </svg>
  );
}

interface SocialAuthButtonsProps {
  mode: "login" | "register";
}

/**
 * Tombol social auth (Google, GitHub, Apple) gaya putih/border bersih.
 * Google & GitHub memicu `signInWithOAuth` SUPABASE (bukan Auth.js) sehingga
 * user langsung mendapat sesi Supabase yang sah untuk RLS `auth.uid()`;
 * Apple masih dinonaktifkan ("Mendatang") sampai kredensial tersedia.
 */
export function SocialAuthButtons({ mode }: SocialAuthButtonsProps) {
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(
    null,
  );
  const dividerText =
    mode === "login" ? "Atau masuk dengan" : "Atau daftar dengan";

  async function handleSignIn(
    event: MouseEvent<HTMLButtonElement>,
    provider: OAuthProvider,
  ): Promise<void> {
    // Cegah submit/reload form induk; OAuth murni memicu redirect penyedia.
    event.preventDefault();

    if (pendingProvider) {
      return;
    }

    setPendingProvider(provider);

    try {
      const supabase = createSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}${OAUTH_CALLBACK_PATH}?next=${encodeURIComponent(DEFAULT_REDIRECT_PATH)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });

      if (error) {
        throw error;
      }

      // Sukses: supabase-js mengalihkan browser ke penyedia OAuth. Pending
      // sengaja dibiarkan aktif sampai halaman benar-benar berpindah.
    } catch {
      toast.error(
        `Gagal masuk dengan ${PROVIDER_LABEL[provider]}. Silakan coba lagi.`,
      );
      setPendingProvider(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="h-px flex-1 bg-slate-200" />
        <span className="text-xs text-slate-400">{dividerText}</span>
        <span aria-hidden="true" className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={(event) => handleSignIn(event, "google")}
          disabled={pendingProvider !== null}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-all duration-200 hover:border-indigo-300 hover:bg-indigo-50/50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pendingProvider === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
          <span>Lanjutkan dengan Google</span>
        </button>

        <button
          type="button"
          onClick={(event) => handleSignIn(event, "github")}
          disabled={pendingProvider !== null}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-all duration-200 hover:border-indigo-300 hover:bg-indigo-50/50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pendingProvider === "github" ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitHubIcon />}
          <span>Lanjutkan dengan GitHub</span>
        </button>

        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Apple Sign-In Mendatang"
          className="relative flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-400 opacity-60 transition-all duration-200 disabled:cursor-not-allowed"
        >
          <AppleIcon />
          <span>Lanjutkan dengan Apple</span>
          <span className="absolute right-3 rounded-full bg-amber-100 px-2 py-0.5 text-[0.65rem] font-semibold text-amber-700">
            Mendatang
          </span>
        </button>
      </div>
    </div>
  );
}
