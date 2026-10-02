"use client";

import Link from "next/link";
import { Building2, Loader2, Lock, Mail, UserPlus, UserRound } from "lucide-react";
import { TextField } from "@/components/ui/TextField";
import { SocialAuthButtons } from "./SocialAuthButtons";
import { AuthErrorAlert } from "./AuthErrorAlert";
import { registerAction } from "../actions";
import { useAuthForm } from "../use-auth-form";

export function RegisterForm() {
  const {
    isPending,
    email,
    emailError,
    fieldErrors,
    formError,
    handleEmailChange,
    handleSubmit,
  } = useAuthForm(registerAction);

  return (
    <form
      method="post"
      action="#"
      onSubmit={handleSubmit}
      noValidate
      autoComplete="off"
      className="space-y-4"
    >
      <TextField
        id="full_name"
        name="full_name"
        label="Nama Lengkap"
        placeholder="Masukkan nama lengkap kamu"
        icon={UserRound}
        autoComplete="name"
        error={fieldErrors.full_name}
        disabled={isPending}
        required
      />

      <TextField
        id="university"
        name="university"
        label="Nama Universitas"
        placeholder="Masukkan nama universitas kamu"
        icon={Building2}
        autoComplete="organization"
        error={fieldErrors.university}
        disabled={isPending}
        required
      />

      <TextField
        id="email"
        name="email"
        type="email"
        label="Email"
        placeholder="Masukkan email kamu"
        icon={Mail}
        autoComplete="email"
        value={email}
        onChange={handleEmailChange}
        error={emailError ?? fieldErrors.email}
        hint="Gunakan email kampus aktif (contoh: nama@kampus.ac.id)"
        disabled={isPending}
        required
      />

      <TextField
        id="password"
        name="password"
        type="password"
        label="Password"
        placeholder="Masukkan kata sandi"
        icon={Lock}
        autoComplete="new-password"
        error={fieldErrors.password}
        disabled={isPending}
        required
      />

      {formError ? <AuthErrorAlert message={formError} /> : null}

      <button
        type="submit"
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-xl transition-colors shadow-md shadow-indigo-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <UserPlus className="h-4 w-4" />
        )}
        <span>{isPending ? "Memproses..." : "Daftar"}</span>
      </button>

      <SocialAuthButtons mode="register" />

      <p className="text-center text-xs text-slate-500">
        Sudah punya akun?{" "}
        <Link
          href="/login"
          className="font-semibold text-indigo-600 transition-all duration-200 hover:text-indigo-700 active:scale-95"
        >
          Masuk
        </Link>
      </p>
    </form>
  );
}
