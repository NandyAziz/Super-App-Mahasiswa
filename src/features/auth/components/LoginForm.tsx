"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, Lock, Mail } from "lucide-react";
import { TextField } from "@/components/ui/TextField";
import { loginAction } from "../actions";
import { useAuthForm } from "../use-auth-form";
import { AuthErrorAlert } from "./AuthErrorAlert";
import { OAuthLoadingOverlay } from "./OAuthLoadingOverlay";
import { PasswordToggle } from "./PasswordToggle";
import { SocialAuthButtons } from "./SocialAuthButtons";

interface LoginFormProps {
  /** Pesan error awal dari server (mis. `?error=oauth` pada callback OAuth). */
  initialError?: string | null;
}

/**
 * Form masuk: satu kolom identitas (email ATAU nomor HP), kata sandi dengan
 * tombol lihat/sembunyikan, baris "Tetap masuk" + "Lupa Kata Sandi?", tombol
 * "Masuk", lalu seksi "atau lanjutkan dengan".
 *
 * Logika pending/field-error/toast/redirect memakai `useAuthForm` yang sama
 * dengan form auth lain, sehingga perilakunya konsisten.
 *
 * CATATAN: input email mentah sengaja TIDAK memakai validasi real-time
 * `validateEmail` milik hook, karena kolom ini juga menerima nomor HP.
 */
export function LoginForm({ initialError = null }: LoginFormProps) {
  const { isPending, fieldErrors, formError, handleSubmit } =
    useAuthForm(loginAction);
  const [showPassword, setShowPassword] = useState(false);
  const toggle = () => setShowPassword((visible) => !visible);

  // Error dari Server Action menang; `initialError` hanya untuk kasus awal.
  const alertMessage = formError ?? initialError;

  return (
    <div className="space-y-5">
      {alertMessage ? <AuthErrorAlert message={alertMessage} /> : null}

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
          autoComplete="current-password"
          error={fieldErrors.password}
          disabled={isPending}
          required
          trailing={<PasswordToggle visible={showPassword} onToggle={toggle} />}
        />

        <div className="flex items-center justify-between gap-3">
          <label
            htmlFor="remember"
            className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600"
          >
            <input
              id="remember"
              name="remember"
              type="checkbox"
              defaultChecked
              className="h-4 w-4 accent-indigo-600"
            />
            Tetap masuk
          </label>

          <Link
            href="/forgot-password"
            className="text-xs font-semibold text-indigo-600 transition-all duration-200 hover:text-indigo-700 active:scale-95"
          >
            Lupa Kata Sandi?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 font-semibold text-white shadow-md shadow-indigo-200 transition-all duration-200 hover:bg-indigo-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          <span>{isPending ? "Memproses..." : "Masuk"}</span>
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

        <SocialAuthButtons mode="login" layout="inline" />
      </div>

      <p className="text-center text-xs text-slate-500">
        Belum punya akun?{" "}
        <Link
          href="/register"
          className="font-semibold text-indigo-600 transition-all duration-200 hover:text-indigo-700 active:scale-95"
        >
          Daftar
        </Link>
      </p>

      {/* Modal glassmorphic "Memproses masuk..." ditampil SELAMA proses masuk
          (password) berjalan — `isPending` aktif dari klik "Masuk" hingga
          redirect ke dashboard, dipresentasikan lewat portal. */}
      <OAuthLoadingOverlay open={isPending} label="Memproses masuk..." />
    </div>
  );
}

