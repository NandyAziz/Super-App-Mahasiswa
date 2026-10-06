import type { Metadata } from "next";
import { AuthHeader } from "@/features/auth/components/AuthHeader";
import { AuthHeroBackground } from "@/features/auth/components/AuthHeroBackground";
import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Atur Ulang Kata Sandi · Campify",
};

/**
 * Halaman penetapan kata sandi baru.
 *
 * Sengaja TIDAK terdaftar di `AUTH_ROUTES` (`src/proxy.ts`): halaman ini justru
 * memerlukan sesi, yaitu sesi pemulihan yang terbentuk setelah `/auth/callback`
 * menukar `?code` dari tautan email. Pengguna tanpa sesi akan dipantulkan ke
 * `/login`.
 */
export default function ResetPasswordPage() {
  return (
    <main className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-slate-50 p-4">
      <AuthHeroBackground />
      <div className="relative w-full rounded-3xl border border-slate-100 bg-white p-8 shadow-xl">
        <AuthHeader
          title="Atur Ulang Kata Sandi"
          subtitle="Buat kata sandi baru untuk akunmu"
        />
        <ResetPasswordForm />
      </div>
    </main>
  );
}
