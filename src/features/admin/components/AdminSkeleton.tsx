import { Skeleton } from "@/components/ui/Skeleton";

/** Placeholder loading dashboard operator (kartu + tab + tabel). */
export function AdminSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="rounded-2xl border border-white/20 bg-white/70 p-3 backdrop-blur-md"
          >
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="mt-2 h-4 w-16" />
            <Skeleton className="mt-1 h-2.5 w-12" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-2xl border border-white/20 bg-white/70 p-1 backdrop-blur-md">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <Skeleton key={index} className="h-8 rounded-xl" />
        ))}
      </div>

      <div className="space-y-2">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/70 p-4 backdrop-blur-md"
          >
            <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-2.5 w-40" />
            </div>
            <Skeleton className="h-8 w-16 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
