import type { Metadata } from "next";
import { AuthHeader } from "@/features/auth/components/AuthHeader";
import { AuthHeroBackground } from "@/features/auth/components/AuthHeroBackground";
import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Lupa Kata Sandi · Campify",
};

/**
 * Halaman publik (tanpa sesi) untuk meminta tautan atur ulang kata sandi.
 * Terdaftar di `AUTH_ROUTES` (`src/proxy.ts`) agar pengguna anonim tidak
 * dipantulkan ke `/login`.
 */
export default function ForgotPasswordPage() {
  return (
    <main className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-slate-50 p-4">
      <AuthHeroBackground />
      <div className="relative w-full rounded-3xl border border-slate-100 bg-white p-8 shadow-xl">
        <AuthHeader
          title="Lupa Kata Sandi"
          subtitle="Kami kirim tautan atur ulang ke emailmu"
        />
        <ForgotPasswordForm />
      </div>
    </main>
  );
}
