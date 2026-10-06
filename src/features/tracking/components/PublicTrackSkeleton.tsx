import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Placeholder hasil pelacakan selama RPC `track_order` berjalan di server
 * (ditampilkan lewat `<Suspense>` di `/track`).
 */
export function PublicTrackSkeleton() {
  return (
    <div className="rounded-3xl border border-white/20 bg-white/70 p-5 shadow-sm backdrop-blur-md">
      <div className="flex items-start gap-3">
        <Skeleton className="h-12 w-12 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-12 w-full rounded-2xl" />
      <Skeleton className="mt-3 h-4 w-3/4" />
    </div>
  );
}
