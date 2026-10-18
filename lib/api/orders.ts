import type { Order } from "@/lib/types";
import { usePortalStore } from "@/lib/store";
import { clone, delay } from "@/lib/api/_shared";

export async function listOrders(userId: string): Promise<Order[]> {
  await delay();

  const { orders } = usePortalStore.getState();
  const source = orders.filter((order) => order.userId === userId);

  return clone(source).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
}

export async function getOrder(
  userId: string,
  orderId: string,
): Promise<Order | null> {
  await delay();

  const match = usePortalStore
    .getState()
    .orders.find((order) => order.id === orderId && order.userId === userId);

  return match ? clone(match) : null;
}
