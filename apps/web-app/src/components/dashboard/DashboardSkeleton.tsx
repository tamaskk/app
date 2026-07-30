import { Skeleton } from "@/components/ui/Skeleton";

// _DashboardSkeleton — same block rhythm as the app's shimmer placeholder.
export function DashboardSkeleton() {
  return (
    <div className="px-5 pt-2 lg:px-0">
      <header className="flex h-14 items-center justify-between">
        <div className="flex gap-1.5">
          <Skeleton className="h-[26px] w-[52px] rounded-full" />
          <Skeleton className="h-[26px] w-[52px] rounded-full" />
        </div>
        <Skeleton className="h-4 w-16" />
        <div className="w-16" />
      </header>

      <div className="mt-2">
        <Skeleton className="h-3.5 w-[70px]" />
        <Skeleton className="mt-2.5 h-8 w-[190px]" />
        <Skeleton className="mt-2.5 h-3 w-[150px]" />
      </div>

      <div className="mt-7 flex justify-between">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Skeleton className="h-2.5 w-6" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        ))}
      </div>

      <Skeleton className="mt-7 h-[190px] w-full rounded-3xl" />

      <Skeleton className="mt-6 h-3.5 w-[130px]" />
      <div className="mt-3.5 flex flex-col gap-3">
        <Skeleton className="h-[74px] w-full rounded-[18px]" />
        <Skeleton className="h-[74px] w-full rounded-[18px]" />
        <Skeleton className="h-[74px] w-full rounded-[18px]" />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Skeleton className="h-[84px] rounded-[18px]" />
        <Skeleton className="h-[84px] rounded-[18px]" />
      </div>
    </div>
  );
}
