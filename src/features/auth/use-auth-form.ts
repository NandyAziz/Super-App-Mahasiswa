"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { validateEmail } from "./schemas";
import type { AuthActionResult } from "./types";

export interface UseAuthFormResult {
  isPending: boolean;
  email: string;
  emailError: string | null;
  fieldErrors: Record<string, string>;
  /** Pesan error umum (non-field) untuk banner inline di atas tombol submit. */
  formError: string | null;
  handleEmailChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

/**
 * Logika form autentikasi yang dipakai bersama oleh form Login & Register:
 * pending state, validasi email real-time, Toast feedback, dan navigasi.
 */
export function useAuthForm(
  submitAction: (formData: FormData) => Promise<AuthActionResult>,
): UseAuthFormResult {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  function applyResult(result: AuthActionResult): void {
    if (result.status === "error") {
      setFieldErrors(result.fieldErrors ?? {});
      setFormError(result.message);
      toast.error(result.message);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    toast.success(result.message);

    if (result.redirectTo) {
      router.replace(result.redirectTo);
      router.refresh();
    }
  }

  function handleEmailChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const value = event.target.value;
    setEmail(value);
    setEmailError(validateEmail(value));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFormError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        applyResult(await submitAction(formData));
      } catch {
        const message =
          "Terjadi gangguan tak terduga saat menghubungi server. Silakan coba lagi.";
        setFormError(message);
        toast.error(message);
      }
    });
  }

  return {
    isPending,
    email,
    emailError,
    fieldErrors,
    formError,
    handleEmailChange,
    handleSubmit,
  };
}
