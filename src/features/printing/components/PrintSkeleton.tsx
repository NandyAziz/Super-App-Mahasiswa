import { Skeleton } from "@/components/ui/Skeleton";

export function PrintSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="rounded-3xl border border-white/20 bg-white/70 p-4 backdrop-blur-md"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-2xl" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-2.5 w-20" />
              </div>
            </div>
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>

          <div className="mt-3 flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>

          <Skeleton className="mt-3 h-9 w-full rounded-2xl" />
          <Skeleton className="mt-3 h-9 w-full rounded-2xl" />
        </div>
      ))}
    </div>
  );
}
