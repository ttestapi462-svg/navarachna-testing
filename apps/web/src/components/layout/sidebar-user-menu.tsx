"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { useAuth } from "@/context/dashboard-auth-context";
import { ChevronsUpDown, LogOut, User } from "lucide-react";
import { LogoutConfirmationDialog } from "./logout-confirmation-dialog";

export function SidebarUserMenu() {
  const { user } = useAuth();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  if (!user) return null;

  const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "NA";
  const fullName = `${user.firstName || "Studio"} ${user.lastName || "Admin"}`.trim();

  return (
    <>
      <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          size="default"
          tooltip={fullName}
          className="h-9 px-2 rounded-lg gap-2.5 cursor-pointer hover:bg-muted/60 data-[state=open]:bg-muted/80 transition-colors group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mx-auto"
        >
          <Avatar className="size-7 group-data-[collapsible=icon]:size-8 rounded-full border border-primary/20 bg-primary/10 text-primary font-semibold text-[11px] shrink-0">
            <AvatarFallback className="rounded-full bg-primary/10 text-primary font-medium text-[11px]">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left leading-none group-data-[collapsible=icon]:hidden">
            <span className="truncate font-medium text-foreground text-xs">{fullName}</span>
            <span className="truncate text-[10px] text-muted-foreground mt-0.5">
              @{user.username}
            </span>
          </div>
          <ChevronsUpDown className="ml-auto size-3.5 text-muted-foreground/70 shrink-0 group-data-[collapsible=icon]:hidden" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-(--radix-dropdown-menu-trigger-width) min-w-52 rounded-2xl p-1.5 shadow-xl border-border/50 bg-background/80 backdrop-blur-xl"
        side="top"
        align="end"
        sideOffset={6}
      >
        <DropdownMenuLabel className="p-1 font-normal">
          <div className="flex items-center gap-2 px-1 py-1 text-left">
            <Avatar className="size-7 rounded-full border border-primary/20 bg-primary/10 text-primary font-semibold text-[11px] shrink-0">
              <AvatarFallback className="rounded-full bg-primary/10 text-primary font-medium text-[11px]">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left leading-none">
              <span className="truncate font-medium text-foreground text-xs">{fullName}</span>
              <span className="truncate text-[10px] text-muted-foreground mt-0.5">
                {user.email || `@${user.username}`}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="my-1 bg-border/40" />

        <DropdownMenuItem asChild>
          <Link href="/#profile" className="flex items-center gap-2 w-full">
            <User className="size-3.5" />
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1 bg-border/40" />

        {/* Logout Option - Prompts Confirmation Dialog */}
        <DropdownMenuItem
          variant="destructive"
          onSelect={(e) => {
            e.preventDefault();
            setShowLogoutDialog(true);
          }}
        >
          <LogOut className="size-3.5" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <LogoutConfirmationDialog
      open={showLogoutDialog}
      onOpenChange={setShowLogoutDialog}
    />
    </>
  );
}
