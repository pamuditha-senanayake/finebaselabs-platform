import { cn } from "@/lib/utils";

import { formatDateTime } from "@/lib/format";
import type { EventActor, RequestEvent } from "@/lib/types";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";

export const ACTOR_LABELS: Record<EventActor, string> = {
  SYSTEM: "System",
  FINEBRAIN: "FineBrain",
  CUSTOMER: "Customer",
  SUPPORT_AGENT: "Support Agent",
  ADMIN: "Admin",
};

export function ActivityTimeline({
  events,
  className,
}: {
  events: RequestEvent[];
  className?: string;
}) {
  const timeline = events
    .slice()
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  if (timeline.length === 0) {
    return (
      <EmptyState message="No activity recorded yet." className={className} />
    );
  }

  return (
    <ol className={cn("flex flex-col", className)}>
      {timeline.map((event, index) => (
        <li key={event.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-[#3B82F6]" />
            {index < timeline.length - 1 && (
              <span className="w-px flex-1 bg-slate-800/60" />
            )}
          </div>
          <div className="flex flex-1 flex-col gap-1.5 pb-6 last:pb-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">
                {ACTOR_LABELS[event.actor]}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDateTime(event.createdAt)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Status</span>
              <StatusBadge status={event.status} />
            </div>
            <p className="text-sm text-muted-foreground">{event.message}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
