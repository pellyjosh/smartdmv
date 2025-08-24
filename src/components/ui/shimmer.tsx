import { cn } from "@/lib/utils";

export function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer",
        className
      )}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 space-y-4">
      <div className="space-y-2">
        <Shimmer className="h-5 w-3/4 rounded" />
        <Shimmer className="h-4 w-1/2 rounded" />
      </div>
      <Shimmer className="h-4 w-full rounded" />
      <Shimmer className="h-4 w-2/3 rounded" />
      <Shimmer className="h-10 w-full rounded" />
    </div>
  );
}

export function AppointmentCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
      <div className="p-4 pb-2">
        <div className="flex justify-between items-start">
          <div className="space-y-2 flex-1">
            <Shimmer className="h-5 w-3/4 rounded" />
            <div className="flex items-center space-x-2">
              <Shimmer className="h-4 w-4 rounded" />
              <Shimmer className="h-4 w-24 rounded" />
              <Shimmer className="h-4 w-4 rounded" />
              <Shimmer className="h-4 w-16 rounded" />
            </div>
          </div>
          <Shimmer className="h-6 w-16 rounded-full" />
        </div>
      </div>
      <div className="px-4 pb-3">
        <Shimmer className="h-4 w-full rounded mb-4" />
        <div className="flex items-center space-x-2">
          <Shimmer className="h-4 w-4 rounded" />
          <Shimmer className="h-4 w-24 rounded" />
        </div>
      </div>
      <div className="px-4 pt-1 pb-4">
        <Shimmer className="h-10 w-full rounded" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4 rounded-lg border">
          <Shimmer className="h-12 w-12 rounded-full" />
          <div className="space-y-2 flex-1">
            <Shimmer className="h-4 w-3/4 rounded" />
            <Shimmer className="h-3 w-1/2 rounded" />
          </div>
          <Shimmer className="h-8 w-20 rounded" />
        </div>
      ))}
    </div>
  );
}
