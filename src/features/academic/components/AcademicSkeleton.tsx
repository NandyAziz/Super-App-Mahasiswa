import { Skeleton } from "@/components/ui/Skeleton";

export function AcademicSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-11 w-full rounded-2xl" />

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
                <Skeleton className="h-2.5 w-40" />
              </div>
            </div>
            <Skeleton className="h-5 w-28 rounded-full" />
          </div>

          <Skeleton className="mt-3 h-3 w-2/3" />
          <Skeleton className="mt-2 h-3 w-1/2" />
          <Skeleton className="mt-3 h-9 w-full rounded-2xl" />
        </div>
      ))}
    </div>
  );
}
