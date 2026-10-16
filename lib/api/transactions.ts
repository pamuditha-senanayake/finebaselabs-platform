import type { Transaction } from "@/lib/types";
import { usePortalStore } from "@/lib/store";
import { clone, delay } from "@/lib/api/_shared";

export async function listTransactions(
  userId: string,
): Promise<Transaction[]> {
  await delay();

  const { transactions } = usePortalStore.getState();
  const source = transactions.filter(
    (transaction) => transaction.userId === userId,
  );

  return clone(source).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
}

export async function getTransaction(id: string): Promise<Transaction | null> {
  await delay();

  const match = usePortalStore
    .getState()
    .transactions.find((transaction) => transaction.id === id);

  return match ? clone(match) : null;
}
