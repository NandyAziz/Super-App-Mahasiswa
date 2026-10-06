import type { Metadata } from "next";
import { AuthHeroShell } from "@/features/auth/components/AuthHeroShell";
import { GuestTrackLink } from "@/features/auth/components/GuestTrackLink";
import { LoginForm } from "@/features/auth/components/LoginForm";

export const metadata: Metadata = {
  title: "Masuk · Campify",
};

interface LoginPageProps {
  /** Next.js 16: `searchParams` adalah Promise dan wajib di-await. */
  searchParams: Promise<{ error?: string }>;
}

/**
 * Layar masuk bergaya Parcel (kanvas native `max-w-md`).
 *
 * Struktur header bergradasi + kartu putih yang menindih disediakan oleh
 * `AuthHeroShell` — komponen bersama yang dipakai juga oleh `/register`
 * sehingga kedua layar dijamin identik secara visual dan tata letak.
 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  const oauthError =
    error === "oauth"
      ? "Login dengan penyedia OAuth gagal atau dibatalkan. Silakan coba lagi."
      : null;

  return (
    <AuthHeroShell title="Selamat Datang Kembali" footer={<GuestTrackLink />}>
      <LoginForm initialError={oauthError} />
    </AuthHeroShell>
  );
}
