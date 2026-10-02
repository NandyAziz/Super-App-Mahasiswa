import { AlertCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface TextFieldProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: LucideIcon;
  prefix?: string;
  error?: string | null;
  hint?: string;
}

/**
 * Input teks standar aplikasi (label, ikon/prefix, pesan error, dan hint).
 * Dipakai oleh form autentikasi maupun form fitur lainnya.
 */
export function TextField({
  label,
  icon: Icon,
  prefix,
  error,
  hint,
  id,
  className,
  ...props
}: TextFieldProps) {
  const hasAdornment = Boolean(Icon) || Boolean(prefix);

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium text-slate-600">
        {label}
      </label>

      <div className="relative">
        {Icon ? (
          <Icon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
        ) : null}
        {!Icon && prefix ? (
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs font-medium text-slate-400">
            {prefix}
          </span>
        ) : null}

        <input
          id={id}
          aria-invalid={Boolean(error)}
          className={cn(
            "w-full rounded-xl border bg-white py-3 pr-3 text-sm text-slate-900",
            "placeholder:text-slate-400 outline-none transition-all duration-150 focus:ring-2",
            hasAdornment ? "pl-10" : "pl-3",
            error
              ? "border-red-300 focus:border-transparent focus:ring-2 focus:ring-red-200"
              : "border-slate-200 focus:border-transparent focus:ring-2 focus:ring-indigo-600",
            className,
          )}
          {...props}
        />
      </div>

      {error ? (
        <p className="flex items-center gap-1 text-[0.7rem] font-medium text-red-500">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      ) : null}

      {!error && hint ? (
        <p className="text-[0.7rem] text-zinc-400">{hint}</p>
      ) : null}
    </div>
  );
}
