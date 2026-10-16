import Link from "next/link";
import { CompassIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#0B0F17] px-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl border border-slate-800/60 bg-slate-900/40 text-[#3B82F6]">
        <CompassIcon className="size-6" />
      </span>

      <div className="flex flex-col items-center gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          404
        </p>
        <h1 className="text-xl font-semibold tracking-tight">Page not found</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          We couldn&apos;t find the page you were looking for. It may have been
          moved or no longer exists.
        </p>
      </div>

      <Button type="button" variant="outline" asChild>
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
