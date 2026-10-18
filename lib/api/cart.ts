import type { CartItem, Product } from "@/lib/types";
import { usePortalStore } from "@/lib/store";
import { clone, delay } from "@/lib/api/_shared";
import { CommerceError } from "@/lib/errors";

const MIN_QUANTITY = 1;
const MAX_QUANTITY = 10;

function findProduct(productId: string): Product {
  const product = usePortalStore
    .getState()
    .products.find((item) => item.id === productId);

  if (!product) {
    throw new CommerceError("PRODUCT_NOT_FOUND", "Product not found.");
  }

  return product;
}

function assertAvailable(product: Product, quantity: number): void {
  if (!product.active) {
    throw new CommerceError(
      "PRODUCT_INACTIVE",
      `${product.name} is no longer available for purchase.`,
    );
  }

  const isService = product.type === "SERVICE";
  const quantityIsValid =
    Number.isInteger(quantity) &&
    quantity >= MIN_QUANTITY &&
    quantity <= MAX_QUANTITY &&
    (!isService || quantity === 1);

  if (!quantityIsValid) {
    throw new CommerceError(
      "INVALID_QUANTITY",
      isService
        ? `${product.name} can only be ordered with a quantity of 1.`
        : `Quantity for ${product.name} must be between ${MIN_QUANTITY} and ${MAX_QUANTITY}.`,
    );
  }

  if (product.stock !== null && product.stock < quantity) {
    throw new CommerceError(
      "OUT_OF_STOCK",
      product.stock === 0
        ? `${product.name} is out of stock.`
        : `Only ${product.stock} of ${product.name} left in stock.`,
    );
  }
}

function readCart(userId: string): CartItem[] {
  return clone(usePortalStore.getState().carts[userId] ?? []);
}

export async function getCart(userId: string): Promise<CartItem[]> {
  await delay();

  return readCart(userId);
}

export async function addToCart(
  userId: string,
  productId: string,
  quantity = 1,
): Promise<CartItem[]> {
  await delay();

  const product = findProduct(productId);
  const existing = (usePortalStore.getState().carts[userId] ?? []).find(
    (item) => item.productId === productId,
  );
  const nextQuantity = (existing?.quantity ?? 0) + quantity;

  assertAvailable(product, quantity);
  assertAvailable(product, nextQuantity);

  usePortalStore.getState().addItem(userId, productId, quantity);

  return readCart(userId);
}

export async function updateQuantity(
  userId: string,
  productId: string,
  quantity: number,
): Promise<CartItem[]> {
  await delay();

  const product = findProduct(productId);
  assertAvailable(product, quantity);

  usePortalStore.getState().setCartQuantity(userId, productId, quantity);

  return readCart(userId);
}

export async function removeFromCart(
  userId: string,
  productId: string,
): Promise<CartItem[]> {
  await delay();

  usePortalStore.getState().removeCartItem(userId, productId);

  return readCart(userId);
}

export async function clearCart(userId: string): Promise<CartItem[]> {
  await delay();

  usePortalStore.getState().clearUserCart(userId);

  return readCart(userId);
}
