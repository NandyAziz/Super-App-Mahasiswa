import { AlertCircle, ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  icon?: LucideIcon;
  options: SelectOption[];
  error?: string | null;
  hint?: string;
}

/** Dropdown standar aplikasi (label, ikon, pesan error, dan hint). */
export function SelectField({
  label,
  icon: Icon,
  options,
  error,
  hint,
  id,
  className,
  ...props
}: SelectFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium text-zinc-600">
        {label}
      </label>

      <div className="relative">
        {Icon ? (
          <Icon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        ) : null}

        <select
          id={id}
          aria-invalid={Boolean(error)}
          className={cn(
            "w-full appearance-none rounded-2xl border bg-white/70 py-3 pr-9 text-sm text-zinc-900",
            "outline-none transition-all duration-200 focus:ring-2",
            Icon ? "pl-10" : "pl-3",
            error
              ? "border-red-300 focus:border-red-400 focus:ring-red-200/60"
              : "border-white/50 focus:border-indigo-400 focus:ring-indigo-200/60",
            className,
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
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
