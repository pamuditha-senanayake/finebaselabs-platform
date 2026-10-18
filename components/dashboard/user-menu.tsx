"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDownIcon, Loader2Icon, LogOutIcon, UserIcon } from "lucide-react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";

import { logout } from "@/lib/api/auth";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";

const CONTENT_CLASSES =
  "z-50 min-w-40 overflow-hidden rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2";

const ITEM_CLASSES =
  "relative flex cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none transition-colors focus:bg-slate-800/60 focus:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0";

export function UserMenu() {
  const router = useRouter();
  const { currentUser, isLoading } = useSession();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    router.replace("/login");
  }

  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        <Button
          type="button"
          variant="ghost"
          disabled={isLoading || loggingOut}
          className="gap-1.5 px-2"
        >
          {loggingOut ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : null}
          <span className="max-w-32 truncate text-sm font-medium">
            {isLoading ? "…" : (currentUser?.name ?? "Guest")}
          </span>
          <ChevronDownIcon className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuPrimitive.Trigger>

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align="end"
          sideOffset={8}
          className={CONTENT_CLASSES}
        >
          <DropdownMenuPrimitive.Label className="px-2 py-1.5 text-xs text-muted-foreground">
            {currentUser?.email ?? ""}
          </DropdownMenuPrimitive.Label>
          <DropdownMenuPrimitive.Separator className="-mx-1 my-1 h-px bg-slate-800/60" />
          <DropdownMenuPrimitive.Item asChild>
            <Link href="/dashboard/account" className={ITEM_CLASSES}>
              <UserIcon />
              Account
            </Link>
          </DropdownMenuPrimitive.Item>
          <DropdownMenuPrimitive.Item asChild>
            <button type="button" onClick={handleLogout} className={ITEM_CLASSES}>
              <LogOutIcon />
              Logout
            </button>
          </DropdownMenuPrimitive.Item>
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}
