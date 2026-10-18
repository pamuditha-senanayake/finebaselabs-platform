import type { ReactNode } from "react";

import { AppShell } from "@/components/dashboard/app-shell";
import { AssistantLauncher } from "@/components/assistant/assistant-launcher";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AppShell>
      {children}
      <AssistantLauncher />
    </AppShell>
  );
}
