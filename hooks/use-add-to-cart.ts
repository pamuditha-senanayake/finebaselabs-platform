"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { addToCart } from "@/lib/api/cart";
import { CommerceError } from "@/lib/errors";
import { useSession } from "@/hooks/use-session";
import type { Product } from "@/lib/types";

export interface UseAddToCartResult {
  add: (product: Product, quantity?: number) => Promise<boolean>;
  pendingId: string | null;
}

export function useAddToCart(): UseAddToCartResult {
  const router = useRouter();
  const { currentUser } = useSession();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const add = useCallback(
    async (product: Product, quantity = 1): Promise<boolean> => {
      if (!currentUser) {
        toast.error("Please sign in to add items to your cart.");
        return false;
      }

      setPendingId(product.id);

      try {
        await addToCart(currentUser.id, product.id, quantity);

        toast.success("Added to cart", {
          description: product.name,
          action: {
            label: "View cart",
            onClick: () => router.push("/dashboard/cart"),
          },
        });

        return true;
      } catch (error) {
        toast.error(
          error instanceof CommerceError
            ? error.message
            : "We couldn't add this item to your cart.",
        );
        return false;
      } finally {
        setPendingId(null);
      }
    },
    [currentUser, router],
  );

  return { add, pendingId };
}
