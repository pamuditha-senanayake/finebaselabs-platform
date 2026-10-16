import { usePortalStore } from "@/lib/store";

export function resetMockData(): void {
  // TODO: replace with a backend reset endpoint once one exists.
  usePortalStore.getState().resetMockData();
}
