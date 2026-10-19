"use client";

import { ReactNode } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import {
  DashboardAuthProvider,
  useAuth,
} from "@/context/dashboard-auth-context";
import { Layers, Loader2 } from "lucide-react";

function DashboardLayoutContent({ children }: { children: ReactNode }) {
  const { isAuthLoading, isAuthenticated } = useAuth();

  // If session is still verifying, show the elegant atelier splash screen
  if (isAuthLoading || !isAuthenticated) {
    return (
      <div className="h-svh max-h-svh w-full bg-background flex flex-col items-center justify-center p-4 overflow-hidden">
        <div className="h-16 w-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4 animate-pulse shadow-sm">
          <Layers className="h-8 w-8" />
        </div>
        <p className="text-sm font-semibold text-foreground tracking-wide">
          Navarachna Designer Studio
        </p>
        <p className="text-xs text-primary mt-1.5 flex items-center gap-2 font-medium">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying Active Session...
        </p>
      </div>
    );
  }

  return (
    <SidebarProvider className="h-svh max-h-svh w-full overflow-hidden">
      <AppSidebar />
      <SidebarInset className="h-svh max-h-svh flex flex-col overflow-hidden bg-background text-foreground">
        <DashboardHeader />
        <div className="flex-1 overflow-y-auto min-h-0">
          <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
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
