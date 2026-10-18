"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BoxesIcon,
  FileClockIcon,
  MenuIcon,
  ReceiptTextIcon,
  ShoppingCartIcon,
  StoreIcon,
  UserIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { useCart } from "@/hooks/use-cart";
import { useSession } from "@/hooks/use-session";
import { UserMenu } from "@/components/dashboard/user-menu";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard/store",
    label: "Store",
    icon: StoreIcon,
  },
  {
    href: "/dashboard/transactions",
    label: "Purchases",
    icon: ReceiptTextIcon,
  },
  {
    href: "/dashboard/requests",
    label: "Refund Requests",
    icon: FileClockIcon,
  },
  {
    href: "/dashboard/account",
    label: "Account",
    icon: UserIcon,
  },
];

function isActiveRoute(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function formatCartCount(count: number): string {
  return count > 9 ? "9+" : String(count);
}

function HeaderCartButton() {
  const { currentUser } = useSession();
  const { itemCount } = useCart(currentUser?.id);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="relative"
      asChild
    >
      <Link
        href="/dashboard/cart"
        aria-label={
          itemCount > 0
            ? `Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}`
            : "Cart"
        }
      >
        <ShoppingCartIcon className="size-5" />
        {itemCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-[#3B82F6] px-1 text-[10px] leading-4 font-semibold text-white">
            {formatCartCount(itemCount)}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}

function SidebarContent({
  onNavigate,
  onClose,
}: {
  onNavigate?: () => void;
  onClose?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between gap-2 border-b border-slate-800/60 px-5">
        <Link
          href="/dashboard/store"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-md text-base font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <BoxesIcon className="size-5 text-[#3B82F6]" />
          <span>FineBase Labs</span>
        </Link>

        {onClose ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Close navigation"
            onClick={onClose}
          >
            <XIcon className="size-4" />
          </Button>
        ) : null}
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV_ITEMS.map((item) => {
          const active = isActiveRoute(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/60",
                active
                  ? "border-slate-800/60 bg-slate-800/50 text-foreground"
                  : "text-muted-foreground hover:bg-slate-800/40 hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  active ? "text-[#3B82F6]" : undefined,
                )}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800/60 p-3 text-xs text-muted-foreground">
        FineBase Portal
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-slate-900 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:ring-2 focus:ring-[#3B82F6]"
      >
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-800/60 bg-slate-950/40 lg:block">
        <SidebarContent />
      </aside>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-64 max-w-64 gap-0 p-0"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">
            Primary navigation for the FineBase portal.
          </SheetDescription>
          <SidebarContent
            onNavigate={() => setDrawerOpen(false)}
            onClose={() => setDrawerOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-h-screen flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-800/60 bg-background/80 px-4 backdrop-blur sm:px-6">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open navigation"
            onClick={() => setDrawerOpen(true)}
          >
            <MenuIcon className="size-5" />
          </Button>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <HeaderCartButton />
            <UserMenu />
          </div>
        </header>

        <main id="main-content" className="flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
