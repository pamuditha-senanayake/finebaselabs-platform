import { usePortalStore } from "@/lib/store";

export type Unsubscribe = () => void;

export function subscribe(callback: () => void): Unsubscribe {
  // TODO: replace with a real-time transport (SSE or polling) once the backend
  // exposes change events. For now we rely on the in-memory mock store.
  return usePortalStore.subscribe(callback);
}
