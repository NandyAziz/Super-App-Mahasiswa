import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  /** Ikon besar dalam kartu gradien (mis. `PackagePlus`, `ClipboardList`). */
  icon: LucideIcon;
  /** Judul singkat berisi ringkasan kondisi. */
  title: string;
  /** Kalimat penjelas pendek di bawah judul. */
  description: string;
  /** Baris hint tambahan (opsional) berisi ajakan bertindak. */
  hint?: string;
  /** Tombol aksi opsional (mis. "Bersihkan pencarian"). */
  action?: { label: string; onClick: () => void };
}

/**
 * Empty state bersama untuk seluruh board layanan: ikon gradien besar, judul,
 * deskripsi, hint, dan tombol aksi opsional.
 *
 * Dipakai konsisten oleh jastip, orders, printing, tutoring, dan projects agar
 * tampilan "belum ada data" seragam di seluruh aplikasi (design system Campify).
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  hint,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-indigo-200 bg-white/60 px-6 py-12 text-center backdrop-blur-md">
      <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-50 to-violet-50 text-indigo-500 ring-1 ring-indigo-100">
        <Icon className="h-8 w-8" />
      </span>

      <div className="space-y-1">
        <p className="text-sm font-semibold text-zinc-700">{title}</p>
        <p className="mx-auto max-w-[34ch] text-xs leading-relaxed text-zinc-500">
          {description}
        </p>
      </div>

      {hint ? <p className="text-[0.7rem] text-zinc-400">{hint}</p> : null}

      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className="rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-xs font-semibold text-indigo-600 transition-all duration-200 active:scale-95"
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}