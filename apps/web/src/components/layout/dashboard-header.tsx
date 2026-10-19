"use client";

import { useState } from "react";
import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/context/dashboard-auth-context";
import { ChevronDown, LogOut, User } from "lucide-react";
import { LogoutConfirmationDialog } from "./logout-confirmation-dialog";

export function DashboardHeader() {
  const { user } = useAuth();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const initials = `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase() || "NA";
  const fullName = `${user?.firstName || "Studio"} ${user?.lastName || "Admin"}`.trim();

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border/60 bg-background/95 px-4 sm:px-6 backdrop-blur-md select-none">
      {/* 1. Left: Mobile/Tablet Sidebar Drawer Trigger & Page Title */}
      <div className="flex items-center gap-3">
        <SidebarTrigger className="-ml-1 size-8 text-muted-foreground hover:text-foreground transition-colors cursor-pointer" />
        <Separator orientation="vertical" className="h-4 my-auto self-center bg-border/80" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage className="text-xs font-semibold text-foreground tracking-tight">
                Dashboard
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* 2. Right: Authenticated User Profile */}
      <div className="flex items-center gap-3">
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 rounded-full pl-2.5 pr-1.5 py-1 hover:bg-muted/60 transition-colors border border-transparent hover:border-border/60 cursor-pointer outline-none">
                <div className="text-right hidden sm:block leading-tight">
                  <p className="text-xs font-semibold text-foreground tracking-tight">
                    {fullName}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    @{user.username}
                  </p>
                </div>

                <div className="relative">
                  <Avatar className="size-8 rounded-full border border-primary/20 bg-primary/10 text-primary font-semibold text-xs shadow-2xs">
                    <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-0 right-0 size-2 rounded-full bg-emerald-500 ring-2 ring-background" />
                </div>

                <ChevronDown className="size-3.5 text-muted-foreground/80 hidden sm:block" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              className="w-56 rounded-2xl p-1.5 shadow-xl border-border/50 bg-background/80 backdrop-blur-xl"
              align="end"
              sideOffset={8}
            >
              {/* User Identity Header */}
              <DropdownMenuLabel className="p-1 font-normal">
                <div className="flex items-center gap-2.5 px-2 py-1.5 text-left">
                  <Avatar className="size-8 rounded-full border border-primary/20 bg-primary/10 text-primary font-semibold text-xs shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left leading-none">
                    <span className="truncate font-semibold text-foreground text-xs">{fullName}</span>
                    <span className="truncate text-[10px] text-muted-foreground mt-0.5">
                      {user.email || `@${user.username}`}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator className="my-1 bg-border/40" />

              {/* Profile Option */}
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
        )}

        {/* Confirmation Alert Dialog */}
        <LogoutConfirmationDialog
          open={showLogoutDialog}
          onOpenChange={setShowLogoutDialog}
        />
      </div>
    </header>
  );
}
