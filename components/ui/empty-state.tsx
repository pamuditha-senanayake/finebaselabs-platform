import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  message,
  icon: Icon,
  className,
}: {
  message: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 px-4 py-10 text-center",
        className,
      )}
    >
      {Icon ? (
        <span className="flex size-10 items-center justify-center rounded-lg border border-slate-800/60 bg-slate-950/40 text-muted-foreground">
          <Icon className="size-5" />
        </span>
      ) : null}
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
