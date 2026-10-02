import type { LucideIcon } from "lucide-react";

interface ProfileStatTileProps {
  label: string;
  value: string;
  icon: LucideIcon;
}

export function ProfileStatTile({
  label,
  value,
  icon: Icon,
}: ProfileStatTileProps) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-3 text-center shadow-xs">
      <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-2 text-base font-semibold text-slate-900">{value}</p>
      <p className="text-[0.6rem] font-medium tracking-wide text-slate-400 uppercase">
        {label}
      </p>
    </div>
  );
}
