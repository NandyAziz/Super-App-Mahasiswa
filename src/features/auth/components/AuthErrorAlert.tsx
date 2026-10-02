import { CircleAlert } from "lucide-react";

interface AuthErrorAlertProps {
  message: string;
}

/**
 * Banner error inline untuk form autentikasi.
 *
 * Melengkapi Toast Sonner agar pesan error dari Server Action (mis. "Email
 * sudah terdaftar", "Email rate limit exceeded", "Database error") tetap
 * terlihat jelas di dekat tombol submit, bahkan setelah toast memudar.
 */
export function AuthErrorAlert({ message }: AuthErrorAlertProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-600"
    >
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}