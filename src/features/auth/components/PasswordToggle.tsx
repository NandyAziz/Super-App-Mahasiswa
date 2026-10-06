"use client";

import { Eye, EyeOff } from "lucide-react";

interface PasswordToggleProps {
  /** `true` saat kata sandi sedang ditampilkan sebagai teks biasa. */
  visible: boolean;
  onToggle: () => void;
}

/**
 * Tombol lihat/sembunyikan kata sandi untuk slot `trailing` pada `TextField`.
 *
 * Dipisah ke komponen sendiri karena dipakai tiga form (masuk, daftar, dan
 * atur ulang kata sandi) sehingga gaya serta label aksesibilitasnya identik.
 */
export function PasswordToggle({ visible, onToggle }: PasswordToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={visible}
      aria-label={visible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all duration-200 hover:text-slate-600 active:scale-95"
    >
      {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}
