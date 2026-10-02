import type { Metadata } from "next";
import { AuthHeader } from "@/features/auth/components/AuthHeader";
import { RegisterForm } from "@/features/auth/components/RegisterForm";

export const metadata: Metadata = {
  title: "Daftar · Campify",
};

export default function RegisterPage() {
  return (
    <div className="relative w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
      <AuthHeader
        title="Buat Akun Baru"
        subtitle="Daftar untuk mulai menggunakan Campify"
      />
      <RegisterForm />
    </div>
  );
}
