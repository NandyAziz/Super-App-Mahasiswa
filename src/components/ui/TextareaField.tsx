import { AlertCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface TextareaFieldProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  icon?: LucideIcon;
  error?: string | null;
  hint?: string;
}

/** Textarea standar aplikasi (label, ikon, pesan error, dan hint). */
export function TextareaField({
  label,
  icon: Icon,
  error,
  hint,
  id,
  className,
  ...props
}: TextareaFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium text-zinc-600">
        {label}
      </label>

      <div className="relative">
        {Icon ? (
          <Icon className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-zinc-400" />
        ) : null}

        <textarea
          id={id}
          aria-invalid={Boolean(error)}
          className={cn(
            "w-full resize-none rounded-2xl border bg-white/70 py-3 pr-3 text-sm text-zinc-900",
            "placeholder:text-zinc-400 outline-none transition-all duration-200 focus:ring-2",
            Icon ? "pl-10" : "pl-3",
            error
              ? "border-red-300 focus:border-red-400 focus:ring-red-200/60"
              : "border-white/50 focus:border-indigo-400 focus:ring-indigo-200/60",
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
