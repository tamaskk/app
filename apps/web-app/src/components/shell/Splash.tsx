import { Spinner } from "@/components/ui/Skeleton";

// main.dart `_Splash` — wordmark with wide tracking + a small spinner.
export function Splash() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center">
      <div className="text-sm font-extrabold tracking-[0.36em] text-on-surface">
        HEFTOR
      </div>
      <div className="h-5" />
      <Spinner size={20} className="text-on-surface" />
    </div>
  );
}
