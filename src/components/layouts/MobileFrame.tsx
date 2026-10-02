import { cn } from "@/lib/utils";

type MobileFrameProps = React.PropsWithChildren<{ className?: string }>;

/**
 * Kanvas mobile modern (Clean Mobile Canvas): fullscreen 100% di HP, dan
 * container app terpusat (max-w-md) tanpa cangkang mockup di layar besar.
 */
export function MobileFrame({ children, className }: MobileFrameProps) {
  return (
    <div
      className={cn(
        "relative mx-auto flex min-h-dvh w-full max-w-md flex-col bg-white",
        "sm:border-x sm:border-slate-200/80 sm:shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}
