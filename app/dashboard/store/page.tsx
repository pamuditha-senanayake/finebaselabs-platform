"use client";

import { useEffect, useMemo, useState } from "react";
import { PackageIcon, SearchIcon, SearchXIcon } from "lucide-react";

import { listProducts } from "@/lib/api/products";
import { subscribe } from "@/lib/api/realtime";
import { useAddToCart } from "@/hooks/use-add-to-cart";
import { useSession } from "@/hooks/use-session";
import type { Product, ProductType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/store/product-card";

type TypeFilter = ProductType | "ALL";
type SortOption = "price-asc" | "price-desc";

const TYPE_TABS: { value: TypeFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "SERVICE", label: "Services" },
  { value: "PRODUCT", label: "Products" },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
];

const ALL_CATEGORIES = "ALL";

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <Card
          key={index}
          className="flex flex-col border border-slate-800/60 bg-slate-900/40 ring-0"
        >
          <div className="flex flex-col gap-3 p-4">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="mt-auto flex items-center gap-2 p-4">
            <Skeleton className="h-8 flex-1" />
            <Skeleton className="h-8 flex-1" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function StorePage() {
  const { isLoading: sessionLoading } = useSession();
  const { add, pendingId } = useAddToCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL_CATEGORIES);
  const [sort, setSort] = useState<SortOption>("price-asc");

  useEffect(() => {
    let active = true;

    async function load(showLoading = true) {
      if (showLoading) setDataLoading(true);
      setError(null);

      try {
        const next = await listProducts();

        if (!active) return;

        setProducts(next);
      } catch {
        if (active) setError("We couldn't load the store right now.");
      } finally {
        if (active && showLoading) setDataLoading(false);
      }
    }

    void load();

    const unsubscribe = subscribe(() => {
      void load(false);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [reloadToken]);

  const loading = sessionLoading || dataLoading;

  function retry() {
    setReloadToken((token) => token + 1);
  }

  const categories = useMemo(() => {
    return Array.from(
      new Set(products.map((product) => product.category)),
    ).sort();
  }, [products]);

  const visibleProducts = useMemo(() => {
    const term = query.trim().toLowerCase();

    const rows = products.filter((product) => {
      if (typeFilter !== "ALL" && product.type !== typeFilter) return false;
      if (
        categoryFilter !== ALL_CATEGORIES &&
        product.category !== categoryFilter
      ) {
        return false;
      }
      if (!term) return true;

      return `${product.name} ${product.description} ${product.category}`
        .toLowerCase()
        .includes(term);
    });

    return rows.sort((a, b) =>
      sort === "price-asc" ? a.price - b.price : b.price - a.price,
    );
  }, [products, query, typeFilter, categoryFilter, sort]);

  const activeCategoryLabel =
    categoryFilter === ALL_CATEGORIES
      ? "All categories"
      : categoryFilter;

  const activeSortLabel =
    SORT_OPTIONS.find((option) => option.value === sort)?.label ?? "";

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Store</h1>
          <p className="text-sm text-muted-foreground">
            Browse services and hardware from the FineBase catalog.
          </p>
        </div>
        <Card className="border border-slate-800/60 bg-slate-900/40 ring-0">
          <CardContent className="px-0">
            <ErrorState message={error} onRetry={retry} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Store</h1>
        <p className="text-sm text-muted-foreground">
          Browse services and hardware from the FineBase catalog.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TYPE_TABS.map((tab) => {
          const active = typeFilter === tab.value;

          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setTypeFilter(tab.value)}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/60",
                active
                  ? "border-slate-800/60 bg-slate-800/60 text-foreground"
                  : "border-transparent text-muted-foreground hover:bg-slate-800/30 hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the store"
            aria-label="Search products"
            className="pl-8"
          />
        </div>

        <Select
          value={categoryFilter}
          onValueChange={(value) => setCategoryFilter(value)}
        >
          <SelectTrigger
            className="w-full sm:w-48"
            aria-label="Filter by category"
          >
            <SelectValue>{activeCategoryLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(value) => setSort(value as SortOption)}>
          <SelectTrigger className="w-full sm:w-52" aria-label="Sort by price">
            <SelectValue>{activeSortLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent position="popper">
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!loading && (
        <p className="text-xs text-muted-foreground">
          Showing {visibleProducts.length} of {products.length} products
        </p>
      )}

      {loading ? (
        <ProductGridSkeleton />
      ) : products.length === 0 ? (
        <Card className="border border-slate-800/60 bg-slate-900/40 ring-0">
          <CardContent className="px-0">
            <EmptyState
              message="No products are available right now."
              icon={PackageIcon}
            />
          </CardContent>
        </Card>
      ) : visibleProducts.length === 0 ? (
        <Card className="border border-slate-800/60 bg-slate-900/40 ring-0">
          <CardContent className="px-0">
            <EmptyState
              message="No products match your search or filters."
              icon={SearchXIcon}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAdd={(item) => void add(item)}
              adding={pendingId === product.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
