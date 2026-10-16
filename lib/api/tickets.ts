import type { Ticket } from "@/lib/types";
import { usePortalStore } from "@/lib/store";
import { clone, delay } from "@/lib/api/_shared";

export async function listTickets(userId: string): Promise<Ticket[]> {
  await delay();

  const { tickets } = usePortalStore.getState();
  const source = tickets.filter((ticket) => ticket.userId === userId);

  return clone(source).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
}
