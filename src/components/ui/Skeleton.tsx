import { cn } from "@/lib/utils";

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

/** Placeholder loading (shimmer) untuk opreasi async saja. */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-xl bg-zinc-200/80", className)}
      {...props}
    />
  );
}
