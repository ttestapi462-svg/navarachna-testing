"use client";

import { ReactNode } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import {
  DashboardAuthProvider,
  useAuth,
} from "@/context/dashboard-auth-context";
import { StudioLoader } from "@/components/brand/studio-loader";

function DashboardLayoutContent({ children }: { children: ReactNode }) {
  const { isAuthLoading, isAuthenticated } = useAuth();

  // If session is still verifying, show the elegant atelier splash screen
  if (isAuthLoading || !isAuthenticated) {
    return <StudioLoader />;
  }

  return (
    <SidebarProvider className="h-svh max-h-svh w-full overflow-hidden">
      <AppSidebar />
      <SidebarInset className="h-svh max-h-svh flex flex-col overflow-hidden bg-background text-foreground">
        <DashboardHeader />
        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
          <main className="flex-1 flex flex-col min-h-0 h-full w-full px-3.5 sm:px-5 py-2.5 sm:py-3">
            {children}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardAuthProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </DashboardAuthProvider>
  );
}
