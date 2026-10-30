"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { LayoutDashboard, Users, type LucideIcon } from "lucide-react";

interface HeaderConfig {
  title: string;
  icon: LucideIcon;
}

function getHeaderConfig(pathname: string): HeaderConfig {
  if (pathname.startsWith("/employees")) {
    return {
      title: "Employee List",
      icon: Users,
    };
  }
  return {
    title: "Atelier Dashboard",
    icon: LayoutDashboard,
  };
}

export function DashboardHeader() {
  const pathname = usePathname();
  const { isMobile } = useSidebar();
  const headerConfig = getHeaderConfig(pathname);
  const HeaderIcon = headerConfig.icon;

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border/60 bg-background/95 px-3.5 sm:px-5 backdrop-blur-md select-none">
      {/* Mobile/Tablet Drawer Trigger & Dynamic Page Title */}
      <div className="flex items-center gap-2.5">
        {isMobile && (
          <>
            <SidebarTrigger className="-ml-1 size-8 text-muted-foreground hover:text-foreground transition-colors cursor-pointer" />
            <Separator orientation="vertical" className="h-4 my-auto self-center bg-border/80" />
          </>
        )}
        <div className="flex items-center gap-2">
          <HeaderIcon className="size-4.5 text-primary shrink-0" />
          <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
            {headerConfig.title}
          </h1>
        </div>
      </div>
    </header>
  );
}
