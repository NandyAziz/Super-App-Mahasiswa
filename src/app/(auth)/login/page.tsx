import type { Metadata } from "next";
import { AuthHeader } from "@/features/auth/components/AuthHeader";
import { LoginForm } from "@/features/auth/components/LoginForm";

export const metadata: Metadata = {
  title: "Masuk · Campify",
};

interface LoginPageProps {
  /** Next.js 16: `searchParams` adalah Promise dan wajib di-await. */
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  const oauthError =
    error === "oauth"
      ? "Login dengan penyedia OAuth gagal atau dibatalkan. Silakan coba lagi."
      : null;

  return (
    <div className="relative w-full rounded-3xl border border-slate-100 bg-white p-8 shadow-xl">
      <AuthHeader title="Masuk ke Akun" subtitle="Selamat datang!" />
      <LoginForm initialError={oauthError} />
    </div>
  );
}
