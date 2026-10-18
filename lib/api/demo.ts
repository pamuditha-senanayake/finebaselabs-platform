import { usePortalStore } from "@/lib/store";

export function resetMockData(): void {
  usePortalStore.getState().resetMockData();
}
