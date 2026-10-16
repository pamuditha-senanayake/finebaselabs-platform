"use client";

import { RefreshCwIcon, TriangleAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0B0F17] text-slate-100 antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl border border-slate-800/60 bg-slate-900/40 text-red-400">
            <TriangleAlertIcon className="size-6" />
          </span>

          <div className="flex flex-col items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">
              Something went wrong
            </h1>
            <p className="max-w-md text-sm text-slate-400">
              A critical error occurred. Try again, or head back to your
              dashboard.
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
              <a href="/dashboard">Back to dashboard</a>
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
