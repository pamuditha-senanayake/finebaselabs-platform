"use client";

import { useEffect, useMemo, useState } from "react";
import { notFound } from "next/navigation";
import {
  CheckIcon,
  GaugeIcon,
  Loader2Icon,
  ScanSearchIcon,
  ScrollTextIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { adminDecision } from "@/lib/api/requests";
import { listUsers } from "@/lib/api/users";
import { formatCurrency } from "@/lib/format";
import { useAllRefundRequests } from "@/hooks/use-all-refund-requests";
import { useSession } from "@/hooks/use-session";
import type { RefundRequest, User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ActivityTimeline } from "@/components/dashboard/activity-timeline";

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="border border-slate-800/60 bg-slate-900/40 ring-0">
      <CardContent className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className="text-2xl font-semibold">{value}</span>
          <span className="text-xs text-muted-foreground">{hint}</span>
        </div>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-slate-800/60 bg-slate-950/40 text-[#3B82F6]">
          <Icon className="size-5" />
        </span>
      </CardContent>
    </Card>
  );
}

const rejectReasonSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, "Please provide at least 5 characters explaining the rejection."),
});

type RejectReasonValues = z.infer<typeof rejectReasonSchema>;

function RejectDialog({
  request,
  submitting,
  onCancel,
  onConfirm,
}: {
  request: RefundRequest | null;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RejectReasonValues>({
    resolver: zodResolver(rejectReasonSchema),
    defaultValues: { reason: "" },
  });

  const submit = handleSubmit((values) => {
    onConfirm(values.reason.trim());
  });

  return (
    <Dialog
      open={request !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Reject refund request</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting{" "}
              <span className="font-mono text-xs">{request?.id}</span>. It is
              recorded in the request log.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="reject-reason">Reason</Label>
            <Textarea
              id="reject-reason"
              placeholder="Explain why this request is being rejected"
              aria-invalid={errors.reason ? true : undefined}
              autoFocus
              {...register("reason")}
            />
            {errors.reason ? (
              <p className="text-xs text-destructive">{errors.reason.message}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={submitting}>
              {submitting ? "Rejecting…" : "Reject request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LogsSheet({
  request,
  customerName,
  onOpenChange,
}: {
  request: RefundRequest | null;
  customerName: string;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={request !== null} onOpenChange={onOpenChange}>
      <SheetContent className="p-0">
        <SheetHeader className="border-b border-slate-800/60 p-4">
          <SheetTitle>Request logs</SheetTitle>
          <SheetDescription>
            {request ? (
              <>
                <span className="font-mono text-xs">{request.id}</span> ·{" "}
                {customerName}
              </>
            ) : null}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-4">
          {request ? <ActivityTimeline events={request.events} /> : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function QueueSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function ReviewQueuePage() {
  const { role, isLoading: sessionLoading } = useSession();
  const {
    requests,
    escalated,
    isLoading: requestsLoading,
    error: requestsError,
    retry: retryRequests,
  } = useAllRefundRequests();
  const [usersById, setUsersById] = useState<Record<string, User>>({});
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [usersReloadToken, setUsersReloadToken] = useState(0);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [logsId, setLogsId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    setUsersLoading(true);
    setUsersError(null);

    listUsers()
      .then((users) => {
        if (!active) return;
        setUsersById(
          Object.fromEntries(users.map((user) => [user.id, user])),
        );
      })
      .catch(() => {
        if (active) setUsersError("We couldn't load the customer directory.");
      })
      .finally(() => {
        if (active) setUsersLoading(false);
      });

    return () => {
      active = false;
    };
  }, [usersReloadToken]);

  const metrics = useMemo(() => {
    const autoApproved = requests.filter((request) =>
      request.events.some(
        (event) => event.actor === "FINEBRAIN" && event.status === "APPROVED",
      ),
    ).length;

    return {
      processed: requests.length,
      approvalRate:
        requests.length === 0
          ? 0
          : Math.round((autoApproved / requests.length) * 100),
      escalated: requests.filter((request) => request.status === "ESCALATED_HUMAN")
        .length,
    };
  }, [requests]);

  const queue = escalated;

  const rejectRequest = rejectId
    ? (requests.find((request) => request.id === rejectId) ?? null)
    : null;
  const logsRequest = logsId
    ? (requests.find((request) => request.id === logsId) ?? null)
    : null;
  const logsCustomerName = logsRequest
    ? (usersById[logsRequest.userId]?.name ?? logsRequest.userId)
    : "";

  if (sessionLoading || requestsLoading || usersLoading) {
    return <QueueSkeleton />;
  }

  if (role !== "ADMIN" && role !== "SUPPORT_AGENT") {
    notFound();
  }

  const loadError =
    requestsError ?? usersError ?? null;

  if (loadError) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Review queue
          </h1>
          <p className="text-sm text-muted-foreground">
            Refund requests escalated to a human for a manual decision.
          </p>
        </div>

        <Card className="border border-slate-800/60 bg-slate-900/40 ring-0">
          <CardContent className="px-0">
            <ErrorState
              message={loadError}
              onRetry={() => {
                retryRequests();
                setUsersReloadToken((token) => token + 1);
              }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  function customerName(userId: string): string {
    return usersById[userId]?.name ?? userId;
  }

  async function handleApprove(request: RefundRequest) {
    setPendingId(request.id);

    try {
      const updated = await adminDecision(request.id, "APPROVED", "");

      if (!updated) {
        toast.error("This request can no longer be approved.");
        return;
      }

      toast.success(`Request ${request.id} approved and refund processed.`);
    } catch {
      toast.error("Something went wrong approving the request.");
    } finally {
      setPendingId(null);
    }
  }

  async function handleReject(request: RefundRequest, reason: string) {
    setPendingId(request.id);

    try {
      const updated = await adminDecision(request.id, "REJECTED", reason);

      if (!updated) {
        toast.error("This request can no longer be rejected.");
        return;
      }

      toast.success(`Request ${request.id} rejected.`);
      setRejectId(null);
    } catch {
      toast.error("Something went wrong rejecting the request.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Review queue</h1>
        <p className="text-sm text-muted-foreground">
          Refund requests escalated to a human for a manual decision.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          label="Total Requests Processed"
          value={metrics.processed}
          hint="All refund requests received"
          icon={ScanSearchIcon}
        />
        <MetricCard
          label="FineBrain Auto-Approval Rate"
          value={`${metrics.approvalRate}%`}
          hint="Approved automatically by FineBrain"
          icon={GaugeIcon}
        />
        <MetricCard
          label="Escalated Queue Count"
          value={metrics.escalated}
          hint="Awaiting a human decision"
          icon={ShieldAlertIcon}
        />
      </div>

      <Card className="border border-slate-800/60 bg-slate-900/40 ring-0">
        <CardHeader>
          <CardTitle>Escalated requests</CardTitle>
          <CardDescription>
            Requests FineBrain could not decide automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {queue.length === 0 ? (
            <EmptyState message="Queue is clear" icon={ShieldCheckIcon} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800/60 text-left text-xs tracking-wide text-muted-foreground uppercase">
                    <th className="px-4 py-2 font-medium">Customer</th>
                    <th className="px-4 py-2 font-medium">Amount</th>
                    <th className="px-4 py-2 font-medium">Reason</th>
                    <th className="hidden px-4 py-2 font-medium lg:table-cell">
                      FineBrain summary
                    </th>
                    <th className="px-4 py-2 font-medium">Confidence</th>
                    <th className="px-4 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((request) => {
                    const busy = pendingId === request.id;

                    return (
                      <tr
                        key={request.id}
                        className="border-b border-slate-800/40 align-top last:border-0"
                      >
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {customerName(request.userId)}
                            </span>
                            <span className="font-mono text-xs text-muted-foreground">
                              {request.id}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {formatCurrency(request.amount, request.currency)}
                        </td>
                        <td className="max-w-[16rem] px-4 py-3">
                          <span className="line-clamp-3">{request.reason}</span>
                        </td>
                        <td className="hidden max-w-[20rem] px-4 py-3 lg:table-cell">
                          <span className="line-clamp-3 text-muted-foreground">
                            {request.brainDecision ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {request.confidence === null
                            ? "—"
                            : `${Math.round(request.confidence * 100)}%`}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={busy}
                              onClick={() => handleApprove(request)}
                            >
                              {busy ? (
                                <Loader2Icon className="animate-spin" />
                              ) : (
                                <CheckIcon />
                              )}
                              Approve
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={busy}
                              onClick={() => setRejectId(request.id)}
                            >
                              <XIcon />
                              Reject
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={busy}
                              onClick={() => setLogsId(request.id)}
                            >
                              <ScrollTextIcon />
                              View Logs
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <RejectDialog
        key={rejectId ?? "none"}
        request={rejectRequest}
        submitting={pendingId === rejectId}
        onCancel={() => setRejectId(null)}
        onConfirm={(reason) => {
          if (rejectRequest) void handleReject(rejectRequest, reason);
        }}
      />

      <LogsSheet
        request={logsRequest}
        customerName={logsCustomerName}
        onOpenChange={(open) => {
          if (!open) setLogsId(null);
        }}
      />
    </div>
  );
}
