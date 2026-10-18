import type { Product, ProductType } from "@/lib/types";
import { usePortalStore } from "@/lib/store";
import { clone, delay } from "@/lib/api/_shared";

export interface ProductFilters {
  search?: string;
  type?: ProductType;
  category?: string;
  includeInactive?: boolean;
}

export async function listProducts(
  filters: ProductFilters = {},
): Promise<Product[]> {
  await delay();

  const { products } = usePortalStore.getState();
  const search = filters.search?.trim().toLowerCase();

  const source = products.filter((product) => {
    if (!filters.includeInactive && !product.active) return false;
    if (filters.type && product.type !== filters.type) return false;
    if (filters.category && product.category !== filters.category) return false;
    if (
      search &&
      !`${product.name} ${product.description} ${product.category}`
        .toLowerCase()
        .includes(search)
    ) {
      return false;
    }

    return true;
  });

  return clone(source).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
}

export async function listCategories(): Promise<string[]> {
  await delay();

  const { products } = usePortalStore.getState();
  const categories = new Set(
    products.filter((product) => product.active).map((product) => product.category),
  );

  return Array.from(categories).sort();
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  await delay();

  const match = usePortalStore
    .getState()
    .products.find((product) => product.slug === slug);

  return match ? clone(match) : null;
}

export async function getProduct(id: string): Promise<Product | null> {
  await delay();

  const match = usePortalStore
    .getState()
    .products.find((product) => product.id === id);

  return match ? clone(match) : null;
}
