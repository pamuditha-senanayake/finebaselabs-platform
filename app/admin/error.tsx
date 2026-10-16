"use client";

import Link from "next/link";
import { RefreshCwIcon, TriangleAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Card className="border border-slate-800/60 bg-slate-900/40 ring-0">
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl border border-slate-800/60 bg-slate-950/40 text-red-400">
          <TriangleAlertIcon className="size-6" />
        </span>

        <div className="flex flex-col items-center gap-2">
          <h1 className="text-lg font-semibold tracking-tight">
            Something went wrong
          </h1>
          <p className="max-w-md text-sm text-muted-foreground">
            We couldn&apos;t load the review queue. Try again, or head back to
            your dashboard.
          </p>
          {error.digest ? (
            <p className="font-mono text-xs text-slate-500">
              Error ID: {error.digest}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button type="button" onClick={reset}>
            <RefreshCwIcon />
            Try again
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
