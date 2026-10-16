export { createId } from "@/lib/ids";

export function delay(ms = 120): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function clone<T>(value: T): T {
  return structuredClone(value);
}
