import { cn } from "@/lib/utils";

type GlassCardProps = React.PropsWithChildren<
  React.HTMLAttributes<HTMLDivElement>
>;

/** Permukaan kartu bersih standar (Clean Modern Card). */
export function GlassCard({ className, children, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200/80 bg-white shadow-xs",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
