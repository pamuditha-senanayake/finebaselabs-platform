import type { Order } from "@/lib/types";
import { usePortalStore } from "@/lib/store";
import { CommerceError } from "@/lib/errors";
import { clone } from "@/lib/api/_shared";
import { getCart } from "@/lib/api/cart";
import { processPayment } from "@/lib/api/payments";

const MIN_QUANTITY = 1;
const MAX_QUANTITY = 10;

export async function placeOrder(userId: string): Promise<Order> {
  const cart = await getCart(userId);

  if (cart.length === 0) {
    throw new CommerceError("EMPTY_CART", "Your cart is empty.");
  }

  const { products } = usePortalStore.getState();
  let currency: string | null = null;
  let total = 0;

  for (const line of cart) {
    const product = products.find((item) => item.id === line.productId);

    if (!product) {
      throw new CommerceError(
        "PRODUCT_NOT_FOUND",
        "One of the products in your cart is no longer available.",
      );
    }
    if (!product.active) {
      throw new CommerceError(
        "PRODUCT_INACTIVE",
        `${product.name} is no longer available for purchase.`,
      );
    }
    if (currency !== null && product.currency !== currency) {
      throw new CommerceError(
        "CURRENCY_MISMATCH",
        "All items in an order must use the same currency.",
      );
    }

    const isService = product.type === "SERVICE";
    const quantityIsValid =
      Number.isInteger(line.quantity) &&
      line.quantity >= MIN_QUANTITY &&
      line.quantity <= MAX_QUANTITY &&
      (!isService || line.quantity === 1);

    if (!quantityIsValid) {
      throw new CommerceError(
        "INVALID_QUANTITY",
        isService
          ? `${product.name} can only be ordered with a quantity of 1.`
          : `Quantity for ${product.name} must be between ${MIN_QUANTITY} and ${MAX_QUANTITY}.`,
      );
    }

    if (product.stock !== null && product.stock < line.quantity) {
      throw new CommerceError(
        "OUT_OF_STOCK",
        product.stock === 0
          ? `${product.name} is out of stock.`
          : `Only ${product.stock} of ${product.name} left in stock.`,
      );
    }

    currency = product.currency;
    total += product.price * line.quantity;
  }

  const payment = await processPayment({
    amount: total,
    currency: currency ?? "USD",
  });

  if (!payment.ok) {
    throw new CommerceError("PAYMENT_FAILED", payment.reason);
  }

  const order = usePortalStore.getState().createOrder(userId);

  return clone(order);
}
