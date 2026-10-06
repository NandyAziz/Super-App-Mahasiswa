"use client";

import Link from "next/link";
import { Loader2, Mail } from "lucide-react";
import { TextField } from "@/components/ui/TextField";
import { requestPasswordResetAction } from "../actions";
import { useAuthForm } from "../use-auth-form";
import { AuthErrorAlert } from "./AuthErrorAlert";

/**
 * Form permintaan tautan atur ulang kata sandi.
 *
 * Memakai `useAuthForm` sehingga validasi email real-time
 * (`validateEmail`) dan toast sukses langsung tersedia. Aksi ini memang tidak
 * mengembalikan `redirectTo`, jadi pengguna tetap di halaman ini setelah
 * tautan terkirim.
 */
export function ForgotPasswordForm() {
  const {
    isPending,
    email,
    emailError,
    fieldErrors,
    formError,
    handleEmailChange,
    handleSubmit,
  } = useAuthForm(requestPasswordResetAction);

  return (
    <form
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
        placeholder="nama@gmail.com"
        icon={Mail}
        autoComplete="email"
        value={email}
        onChange={handleEmailChange}
        error={emailError ?? fieldErrors.email}
        hint="Tautan atur ulang dikirim ke email yang terdaftar."
        disabled={isPending}
        required
      />

      {formError ? <AuthErrorAlert message={formError} /> : null}

      <button
        type="submit"
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 font-semibold text-white shadow-md shadow-indigo-200 transition-all duration-200 hover:bg-indigo-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Mail className="h-4 w-4" />
        )}
        <span>{isPending ? "Mengirim..." : "Kirim Tautan Reset"}</span>
      </button>

      <p className="text-center text-xs text-slate-500">
        Ingat kata sandimu?{" "}
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
