import type { ReactNode } from "react";

import { AppShell } from "@/components/dashboard/app-shell";
import { DemoToolbar } from "@/components/dashboard/demo-toolbar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AppShell>{children}</AppShell>
      <DemoToolbar />
    </>
  );
}
