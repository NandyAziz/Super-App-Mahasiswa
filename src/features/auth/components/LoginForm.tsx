"use client";

import Link from "next/link";
import { Loader2, Lock, LogIn, Mail } from "lucide-react";
import { toast } from "sonner";
import { TextField } from "@/components/ui/TextField";
import { SocialAuthButtons } from "./SocialAuthButtons";
import { AuthErrorAlert } from "./AuthErrorAlert";
import { loginAction } from "../actions";
import { useAuthForm } from "../use-auth-form";

function handleForgotPassword(): void {
  toast.info("Reset kata sandi segera hadir. Hubungi admin kampus.");
}

interface LoginFormProps {
  /** Pesan error awal dari server (mis. `?error=oauth` pada callback OAuth). */
  initialError?: string | null;
}

export function LoginForm({ initialError = null }: LoginFormProps) {
  const {
    isPending,
    email,
    emailError,
    fieldErrors,
    formError,
    handleEmailChange,
    handleSubmit,
  } = useAuthForm(loginAction);

  const alertMessage = formError ?? initialError;

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
        autoComplete="current-password"
        error={fieldErrors.password}
        disabled={isPending}
        required
      />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleForgotPassword}
          className="text-xs font-medium text-indigo-600 transition-all duration-200 hover:text-indigo-700 active:scale-95"
        >
          Lupa kata sandi?
        </button>
      </div>

      {alertMessage ? <AuthErrorAlert message={alertMessage} /> : null}

      <button
        type="submit"
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-xl transition-colors shadow-md shadow-indigo-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <LogIn className="h-4 w-4" />
        )}
        <span>{isPending ? "Memproses..." : "Masuk"}</span>
      </button>

      <SocialAuthButtons mode="login" />

      <p className="text-center text-xs text-slate-500">
        Belum punya akun?{" "}
        <Link
          href="/register"
          className="font-semibold text-indigo-600 transition-all duration-200 hover:text-indigo-700 active:scale-95"
        >
          Daftar
        </Link>
      </p>
    </form>
  );
}
