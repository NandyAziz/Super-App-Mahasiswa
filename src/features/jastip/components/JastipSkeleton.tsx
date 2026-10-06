import { Skeleton } from "@/components/ui/Skeleton";

export function JastipSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-2xl border border-white/20 bg-white/70 p-1 backdrop-blur-md">
        <Skeleton className="h-9 rounded-xl" />
        <Skeleton className="h-9 rounded-xl" />
      </div>

      <div className="space-y-3">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="rounded-2xl border border-white/20 bg-white/70 p-4 backdrop-blur-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-2xl" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
              </div>
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>

            <Skeleton className="mt-3 h-3 w-3/4" />
            <Skeleton className="mt-2 h-3 w-1/2" />
            <Skeleton className="mt-3 h-8 w-full rounded-2xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
