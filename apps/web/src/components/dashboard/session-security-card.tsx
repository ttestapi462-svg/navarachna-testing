"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/dashboard-auth-context";
import {
  Lock,
  Monitor,
  UserCheck,
  Clock,
  Smartphone,
  RefreshCw,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutConfirmationDialog } from "@/components/layout/logout-confirmation-dialog";

export function SessionSecurityCard({ className }: { className?: string }) {
  const { user, refetchAuth } = useAuth();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  return (
    <Card className={cn("rounded-4xl border border-border/70 shadow-sm bg-card", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base text-foreground">
            <Lock className="h-4 w-4 text-primary" />
            Active Session Security
          </CardTitle>
          <Badge variant="success">Device Locked</Badge>
        </div>
        <CardDescription className="text-xs">
          Single device session currently authenticated
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 space-y-2.5 text-xs">
          <div className="flex items-center gap-2 text-foreground">
            <Monitor className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>
              <strong>Bound Device:</strong>{" "}
              {user?.activeDeviceName || "Web Dashboard"}
            </span>
          </div>

          <div className="flex items-center gap-2 text-foreground">
            <UserCheck className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>
              <strong>User:</strong> {user?.firstName}{" "}
              {user?.lastName || ""} (@{user?.username})
            </span>
          </div>

          {user?.email && (
            <p className="text-muted-foreground pl-6">
              <strong>Email:</strong> {user.email}
            </p>
          )}

          {user?.sessionStartedAt && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 text-muted-foreground/80 shrink-0" />
              <span>
                <strong>Session Started:</strong>{" "}
                {new Date(user.sessionStartedAt).toLocaleTimeString()}
              </span>
            </div>
          )}

          {user?.createdAt && (
            <p className="text-[10px] text-muted-foreground pl-6 border-t border-border/50 pt-2">
              Account Created: {new Date(user.createdAt).toLocaleDateString()}
              {user.updatedAt &&
                ` · Updated: ${new Date(user.updatedAt).toLocaleTimeString()}`}
            </p>
          )}
        </div>

        <div className="p-3 rounded-2xl bg-muted/30 border border-border/40 text-[11px] text-muted-foreground flex items-start gap-2">
          <Smartphone className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <span>
            <strong className="text-foreground">Force-Logout Protection:</strong>{" "}
            Signing into the Companion Mobile App will automatically and safely revoke this browser session.
          </span>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refetchAuth}
            className="flex-1 text-xs rounded-3xl cursor-pointer"
          >
            <RefreshCw className="h-3 w-3 mr-1.5" /> Refresh State
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLogoutDialog(true)}
            className="flex-1 text-xs rounded-3xl border-destructive/30 text-destructive hover:bg-destructive/10 cursor-pointer"
          >
            <LogOut className="h-3 w-3 mr-1.5" /> End Session
          </Button>
        </div>
      </CardContent>

      <LogoutConfirmationDialog
        open={showLogoutDialog}
        onOpenChange={setShowLogoutDialog}
      />
    </Card>
  );
}
