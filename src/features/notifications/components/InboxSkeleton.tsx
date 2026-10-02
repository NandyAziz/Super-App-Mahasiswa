import { Skeleton } from "@/components/ui/Skeleton";

export function InboxSkeleton() {
  return (
    <ul className="space-y-3">
      {[0, 1, 2, 3].map((index) => (
        <li
          key={index}
          className="flex gap-3 rounded-3xl border border-white/20 bg-white/70 p-4 backdrop-blur-md"
        >
          <Skeleton className="h-10 w-10 shrink-0 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-2.5 w-24" />
          </div>
        </li>
      ))}
    </ul>
  );
}
