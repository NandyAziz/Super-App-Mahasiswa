"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, Lock, Mail, UserPlus } from "lucide-react";
import { TextField } from "@/components/ui/TextField";
import { registerAction } from "../actions";
import { useAuthForm } from "../use-auth-form";
import { AuthErrorAlert } from "./AuthErrorAlert";
import { OAuthLoadingOverlay } from "./OAuthLoadingOverlay";
import { PasswordToggle } from "./PasswordToggle";
import { SocialAuthButtons } from "./SocialAuthButtons";

/**
 * Form pendaftaran: identitas (email ATAU nomor HP), kata sandi + konfirmasi
 * dengan tombol lihat/sembunyikan, tombol "Daftar", lalu seksi
 * "atau lanjutkan dengan".
 *
 * Tata letak dan gaya inputnya sengaja kembar dengan `LoginForm` supaya kedua
 * layar auth terasa sebagai satu alur yang sama.
 */
export function RegisterForm() {
  const { isPending, fieldErrors, formError, handleSubmit } =
    useAuthForm(registerAction);
  const [showPassword, setShowPassword] = useState(false);
  const toggle = () => setShowPassword((visible) => !visible);

  return (
    <div className="space-y-5">
      {formError ? <AuthErrorAlert message={formError} /> : null}

      <form
        onSubmit={handleSubmit}
        noValidate
        autoComplete="on"
        className="space-y-4"
      >
        <TextField
          id="identifier"
          name="identifier"
          label="Email atau Nomor HP"
          placeholder="contoh@gmail.com atau 08xxxxxxxxxx"
          icon={Mail}
          autoComplete="username"
          error={fieldErrors.identifier}
          disabled={isPending}
          required
        />

        <TextField
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          label="Kata Sandi"
          placeholder="Masukkan kata sandi"
          icon={Lock}
          autoComplete="new-password"
          error={fieldErrors.password}
          disabled={isPending}
          required
          trailing={<PasswordToggle visible={showPassword} onToggle={toggle} />}
        />

        <TextField
          id="confirm"
          name="confirm"
          type={showPassword ? "text" : "password"}
          label="Konfirmasi Kata Sandi"
          placeholder="Ulangi kata sandi"
          icon={Lock}
          autoComplete="new-password"
          error={fieldErrors.confirm}
          disabled={isPending}
          required
        />

        <button
          type="submit"
          disabled={isPending}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 font-semibold text-white shadow-md shadow-indigo-200 transition-all duration-200 hover:bg-indigo-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          <span>{isPending ? "Memproses..." : "Daftar"}</span>
        </button>
      </form>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="h-px flex-1 bg-slate-200" />
          <span className="text-xs font-medium text-slate-400">
            atau lanjutkan dengan
          </span>
          <span aria-hidden="true" className="h-px flex-1 bg-slate-200" />
        </div>

        <SocialAuthButtons mode="register" layout="inline" />
      </div>

      <p className="text-center text-xs text-slate-500">
        Sudah punya akun?{" "}
        <Link
          href="/login"
          className="font-semibold text-indigo-600 transition-all duration-200 hover:text-indigo-700 active:scale-95"
        >
          Masuk
        </Link>
      </p>

      {/* Mirip login: modal glassmorphic "Memproses daftar..." ditampil SELAMA
          proses daftar (password) berjalan — `isPending` aktif dari klik
          "Daftar" hingga redirect ke dashboard, dipresentasikan lewat portal. */}
      <OAuthLoadingOverlay open={isPending} label="Memproses daftar..." />
    </div>
  );
}
