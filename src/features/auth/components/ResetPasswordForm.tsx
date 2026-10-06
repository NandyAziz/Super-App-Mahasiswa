"use client";

import { useState } from "react";
import { KeyRound, Loader2, Lock } from "lucide-react";
import { TextField } from "@/components/ui/TextField";
import { updatePasswordAction } from "../actions";
import { useAuthForm } from "../use-auth-form";
import { AuthErrorAlert } from "./AuthErrorAlert";
import { PasswordToggle } from "./PasswordToggle";

/**
 * Form penetapan kata sandi baru (halaman `/reset-password`).
 *
 * Hanya bisa dibuka setelah tautan pemulihan dari email menukar `?code`
 * menjadi sesi, sehingga kepemilikan email sudah terbukti sebelum kata sandi
 * boleh diubah.
 */
export function ResetPasswordForm() {
  const { isPending, fieldErrors, formError, handleSubmit } =
    useAuthForm(updatePasswordAction);
  const [showPassword, setShowPassword] = useState(false);
  const toggle = () => setShowPassword((visible) => !visible);

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      autoComplete="off"
      className="space-y-4"
    >
      <TextField
        id="password"
        name="password"
        type={showPassword ? "text" : "password"}
        label="Kata Sandi Baru"
        placeholder="Minimal 6 karakter"
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
        placeholder="Ulangi kata sandi baru"
        icon={Lock}
        autoComplete="new-password"
        error={fieldErrors.confirm}
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
          <KeyRound className="h-4 w-4" />
        )}
        <span>{isPending ? "Menyimpan..." : "Simpan Kata Sandi"}</span>
      </button>
    </form>
  );
}
