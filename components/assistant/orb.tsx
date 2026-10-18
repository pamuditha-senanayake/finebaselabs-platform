import { cn } from "@/lib/utils";

export type AssistantOrbState = "idle" | "listening" | "thinking" | "speaking";

const STATE_LABEL: Record<AssistantOrbState, string> = {
  idle: "Assistant is idle",
  listening: "Assistant is listening",
  thinking: "Assistant is thinking",
  speaking: "Assistant is speaking",
};

export function AssistantOrb({
  state,
  className,
}: {
  state: AssistantOrbState;
  className?: string;
}) {
  return (
    <div className={cn("assistant-orb", `assistant-orb--${state}`, className)}>
      <span className="assistant-orb-glow" aria-hidden="true" />
      <span className="assistant-orb-ring" aria-hidden="true" />
      <span
        className="assistant-orb-ring assistant-orb-ring--2"
        aria-hidden="true"
      />
      <span className="sr-only" role="status">
        {STATE_LABEL[state]}
      </span>
    </div>
  );
}
