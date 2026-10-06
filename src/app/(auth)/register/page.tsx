import type { Metadata } from "next";
import { AuthHeroShell } from "@/features/auth/components/AuthHeroShell";
import { GuestTrackLink } from "@/features/auth/components/GuestTrackLink";
import { RegisterForm } from "@/features/auth/components/RegisterForm";

export const metadata: Metadata = {
  title: "Daftar · Campify",
};

/**
 * Layar pendaftaran dengan struktur yang sama persis seperti `/login`
 * (dijamin oleh komponen bersama `AuthHeroShell`): header bergradasi penuh
 * dengan logo Campify + maskot beruang, kartu putih yang menindih header,
 * lalu tombol tamu yang menempel di dasar kartu.
 */
export default function RegisterPage() {
  return (
    <AuthHeroShell title="Buat Akun Baru" footer={<GuestTrackLink />}>
      <RegisterForm />
    </AuthHeroShell>
  );
}

