"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  ArrowUpIcon,
  CheckIcon,
  ChevronDownIcon,
  FlaskConicalIcon,
  HeadsetIcon,
  RotateCcwIcon,
  ShieldIcon,
  UserIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { demoAccounts, login, type DemoRole } from "@/lib/api/auth";
import { resetMockData } from "@/lib/api/demo";
import {
  applyBrainDecision,
  executePayment,
  type FineBrainDecisionStatus,
} from "@/lib/api/finebrain";
import { Button } from "@/components/ui/button";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

const REQUEST_PATH = /^\/dashboard\/requests\/([^/]+)\/?$/;

type SimulationConfig = {
  label: string;
  icon: LucideIcon;
  confidence: number;
  summary: string;
};

const SIMULATIONS: Record<FineBrainDecisionStatus, SimulationConfig> = {
  APPROVED: {
    label: "Approve",
    icon: CheckIcon,
    confidence: 0.94,
    summary:
      "Simulated FineBrain callback: duplicate charge confirmed, approved automatically.",
  },
  REJECTED: {
    label: "Reject",
    icon: XIcon,
    confidence: 0.12,
    summary:
      "Simulated FineBrain callback: no duplicate charge found, request rejected.",
  },
  ESCALATED_HUMAN: {
    label: "Escalate",
    icon: ArrowUpIcon,
    confidence: 0.48,
    summary:
      "Simulated FineBrain callback: confidence below threshold, escalated to a human.",
  },
};

const SIMULATION_ORDER: FineBrainDecisionStatus[] = [
  "APPROVED",
  "REJECTED",
  "ESCALATED_HUMAN",
];

export function DemoToolbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  if (!DEMO_MODE) return null;

  const match = pathname ? REQUEST_PATH.exec(pathname) : null;
  const requestId = match ? decodeURIComponent(match[1]) : null;

  async function switchTo(target: DemoRole) {
    setBusy(target);
    try {
      await login(demoAccounts[target].email, demoAccounts[target].password);
      window.location.assign("/dashboard");
    } catch {
      toast.error("Could not switch the demo session.");
      setBusy(null);
    }
  }

  function handleReset() {
    setBusy("reset");
    resetMockData();
    toast.success("Mock data reset.");
    setBusy(null);
  }

  async function simulate(status: FineBrainDecisionStatus) {
    if (!requestId) return;

    setBusy(status);
    const config = SIMULATIONS[status];

    try {
      const result = await applyBrainDecision({
        request_id: requestId,
        status,
        confidence_score: config.confidence,
        decision_summary: config.summary,
        timestamp: new Date().toISOString(),
      });

      if (!result.ok) {
        toast.error(result.reason);
        return;
      }

      if (status === "APPROVED") {
        await executePayment(requestId);
      }

      toast.success(`FineBrain simulated: ${config.label.toLowerCase()}.`);
    } catch {
      toast.error("Simulation failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="fixed right-4 bottom-4 z-40 flex flex-col items-end gap-2">
      {open ? (
        <div className="w-72 origin-bottom-right rounded-xl border border-slate-800/60 bg-slate-900/95 p-3 text-sm shadow-2xl backdrop-blur duration-150 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5 font-medium">
                <FlaskConicalIcon className="size-4 text-[#3B82F6]" />
                Demo controls
              </span>
              <span className="text-xs text-amber-400/90">
                Mock FineBrain callback, remove when the real webhook is
                connected
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setOpen(false)}
              aria-label="Collapse demo controls"
            >
              <ChevronDownIcon />
            </Button>
          </div>

          <div className="mt-3 flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Session
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="justify-start"
                disabled={busy !== null}
                onClick={() => switchTo("CUSTOMER")}
              >
                <UserIcon />
                Switch to Customer
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="justify-start"
                disabled={busy !== null}
                onClick={() => switchTo("ADMIN")}
              >
                <ShieldIcon />
                Switch to Admin
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="justify-start"
                disabled={busy !== null}
                onClick={() => switchTo("SUPPORT_AGENT")}
              >
                <HeadsetIcon />
                Switch to Support Agent
              </Button>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Data
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="justify-start"
                disabled={busy !== null}
                onClick={handleReset}
              >
                <RotateCcwIcon />
                Reset Mock Data
              </Button>
            </div>

            {requestId ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Simulate FineBrain
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {requestId}
                </span>
                {SIMULATION_ORDER.map((status) => {
                  const config = SIMULATIONS[status];
                  const Icon = config.icon;

                  return (
                    <Button
                      key={status}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="justify-start"
                      disabled={busy !== null}
                      onClick={() => simulate(status)}
                    >
                      <Icon />
                      Simulate FineBrain: {config.label}
                      {busy === status ? "…" : ""}
                    </Button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="size-10 rounded-full border-slate-800/60 bg-slate-900/95 shadow-lg backdrop-blur"
          onClick={() => setOpen(true)}
          aria-label="Open demo controls"
        >
          <FlaskConicalIcon className="size-5 text-[#3B82F6]" />
        </Button>
      )}
    </div>
  );
}
