import { Skeleton } from "@/components/ui/skeleton";

export const TableSkeleton = ({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) => (
  <div className="space-y-2">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-3">
        {Array.from({ length: cols }).map((_, j) => (
          <Skeleton key={j} className="h-10 flex-1" />
        ))}
      </div>
    ))}
  </div>
);
