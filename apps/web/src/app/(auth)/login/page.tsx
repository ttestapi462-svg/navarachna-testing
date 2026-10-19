"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  Layers,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  X,
  Smartphone,
} from "lucide-react";

import { apiClient, setStoredTokens, getStoredToken, clearStoredTokens, ApiError } from "@/lib/api-client";
import { loginSchema, type LoginFormValues } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AtelierHeroIllustration } from "@/components/atelier-hero-illustration";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [displayedReason, setDisplayedReason] = useState<string | null>(() => searchParams.get("reason"));
  const [conflictSession, setConflictSession] = useState<{
    activeDevice: string;
    sessionStartedAt?: string;
  } | null>(null);

  // If reason is present (superseded, terminated, expired), show alert temporarily,
  // clear stale tokens, and clean URL params so refreshing/reloading vanishes the alert.
  useEffect(() => {
    const currentReason = searchParams.get("reason");
    if (currentReason) {
      clearStoredTokens();
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", window.location.pathname);
      }
      return;
    }
    if (getStoredToken()) {
      router.replace("/");
    }
  }, [router, searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const performLogin = async (values: LoginFormValues, forceLogout = false) => {
    setIsSubmitting(true);
    setAuthError(null);

    try {
      const response = await apiClient<{
        success: boolean;
        token: string;
        refreshToken: string;
        user: Record<string, unknown>;
        message?: string;
      }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          identifier: values.identifier,
          password: values.password,
          deviceName: "Web Dashboard",
          forceLogout,
        }),
      });

      if (response.token) {
        setConflictSession(null);
        setStoredTokens(response.token, response.refreshToken);
        queryClient.setQueryData(["authMe"], {
          isAuthenticated: true,
          user: response.user,
        });
        router.replace("/");
      } else {
        setAuthError(response.message || "Failed to authenticate.");
      }
    } catch (err: unknown) {
      if (err instanceof ApiError && err.data?.requiresForceLogout) {
        setConflictSession({
          activeDevice: err.data.activeDevice || "Another Device",
          sessionStartedAt: err.data.sessionStartedAt,
        });
        return;
      }
      setAuthError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = (values: LoginFormValues) => performLogin(values, false);

  return (
    <div className="min-h-screen w-screen lg:h-screen lg:max-h-screen lg:overflow-hidden overflow-y-auto grid grid-cols-1 lg:grid-cols-2 bg-slate-50 font-sans select-none">
      {/* LEFT HALF: Spacious Atelier Brand Showcase */}
      <div className="hidden lg:flex flex-col justify-between h-full bg-gradient-to-br from-rose-50/70 via-rose-50/30 to-slate-50 border-r border-rose-100 p-8 xl:p-12 relative overflow-hidden">
        {/* Subtle Ambient Decorative Rings */}
        <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full border border-rose-200/50 pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full border border-rose-200/40 pointer-events-none" />

        {/* Top: Studio Emblem & Brand Identity */}
        <div className="flex items-center gap-3 z-10">
          <div className="h-10 w-10 rounded-xl bg-white border border-rose-200 flex items-center justify-center text-rose-600 shadow-xs">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base xl:text-lg font-bold tracking-tight text-slate-900 leading-tight">
              Navarachna Designer Studio
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Haute Couture Atelier
            </p>
          </div>
        </div>

        {/* Center: Haute Couture Vector Artwork */}
        <div className="my-auto flex items-center justify-center z-10 py-2 px-4 w-full">
          <AtelierHeroIllustration className="max-w-[380px] xl:max-w-[440px] 2xl:max-w-[480px] w-full" />
        </div>

        {/* Bottom: Studio Philosophy Statement */}
        <div className="z-10 space-y-1 max-w-md">
          <h3 className="text-xl xl:text-2xl font-bold tracking-tight text-slate-900 font-heading leading-snug">
            Precision in every cut. Elegance in every stitch.
          </h3>
          <p className="text-xs xl:text-sm text-slate-500 leading-relaxed font-normal">
            Atelier Operations & Bespoke Garment Management
          </p>
        </div>
      </div>

      {/* RIGHT HALF: Refined & Compact Sign In Panel */}
      <div className="flex flex-col justify-between min-h-screen lg:min-h-0 lg:h-full p-6 sm:p-8 lg:p-10 xl:p-14 bg-white relative overflow-y-auto lg:overflow-hidden">
        {/* Mobile-Only Header */}
        <div className="lg:hidden flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
            <Layers className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-slate-900">
              Navarachna Designer Studio
            </span>
            <p className="text-[10px] text-rose-600 font-semibold uppercase tracking-wider">
              Haute Couture Atelier
            </p>
          </div>
        </div>

        {/* Center: Compact & Refined Sign-in Form Container */}
        <div className="max-w-[380px] xl:max-w-[400px] w-full mx-auto my-auto space-y-5">
          <div className="space-y-1.5">
            <h1 className="text-2xl xl:text-3xl font-extrabold tracking-tight text-slate-900 font-heading">
              Sign In
            </h1>
            <p className="text-xs xl:text-sm text-slate-500 leading-relaxed">
              Enter your studio credentials to access your active workspace.
            </p>
          </div>

          {/* Session Transfer / Expiry Alerts (Temporary: vanishes on page reload or dismiss) */}
          {displayedReason === "session_superseded" && (
            <Alert className="relative border-rose-200 bg-rose-50 text-slate-900 rounded-xl p-3 pr-8 shadow-xs animate-in fade-in duration-300">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <div>
                <AlertTitle className="text-slate-900 text-xs font-semibold">
                  Session Transferred
                </AlertTitle>
                <AlertDescription className="text-slate-600 text-[11px] mt-0.5">
                  Your account was logged in on another device.
                </AlertDescription>
              </div>
              <button
                type="button"
                onClick={() => setDisplayedReason(null)}
                className="absolute top-2.5 right-2.5 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md"
                aria-label="Dismiss notice"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </Alert>
          )}

          {displayedReason === "expired" && (
            <Alert className="relative rounded-xl border-slate-200 bg-slate-50 p-3 pr-8 shadow-xs animate-in fade-in duration-300">
              <Lock className="h-4 w-4 text-slate-500 shrink-0" />
              <div>
                <AlertTitle className="text-slate-900 text-xs font-semibold">
                  Session Expired
                </AlertTitle>
                <AlertDescription className="text-slate-600 text-[11px] mt-0.5">
                  Please sign in again to continue.
                </AlertDescription>
              </div>
              <button
                type="button"
                onClick={() => setDisplayedReason(null)}
                className="absolute top-2.5 right-2.5 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md"
                aria-label="Dismiss notice"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </Alert>
          )}

          {displayedReason === "session_terminated" && (
            <Alert className="relative rounded-xl border-slate-200 bg-slate-50 p-3 pr-8 shadow-xs animate-in fade-in duration-300">
              <Lock className="h-4 w-4 text-slate-500 shrink-0" />
              <div>
                <AlertTitle className="text-slate-900 text-xs font-semibold">
                  Signed Out
                </AlertTitle>
                <AlertDescription className="text-slate-600 text-[11px] mt-0.5">
                  Your session has ended. Please sign in to resume.
                </AlertDescription>
              </div>
              <button
                type="button"
                onClick={() => setDisplayedReason(null)}
                className="absolute top-2.5 right-2.5 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md"
                aria-label="Dismiss notice"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-0.5">
            {authError && (
              <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span className="font-medium">{authError}</span>
              </div>
            )}

            {/* ReUI Field: Username or Email with Prefix User Icon */}
            <Field data-invalid={!!errors.identifier}>
              <FieldLabel htmlFor="identifier" className="text-sm font-semibold text-slate-700 mb-1.5">
                Username or Email
              </FieldLabel>
              <div className="relative">
                <User
                  className="h-4.5 w-4.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                />
                <Input
                  id="identifier"
                  {...register("identifier")}
                  placeholder="admin or admin@navarachna.com"
                  className="pl-10 h-11 text-sm rounded-xl"
                  aria-invalid={!!errors.identifier}
                  disabled={isSubmitting}
                  autoComplete="username"
                />
              </div>
              {errors.identifier && (
                <FieldError className="mt-1 text-xs text-rose-600">{errors.identifier.message}</FieldError>
              )}
            </Field>

            {/* ReUI Field: Password with Prefix LockKey & Trailing Eye Toggle */}
            <Field data-invalid={!!errors.password}>
              <FieldLabel htmlFor="password" className="text-sm font-semibold text-slate-700 mb-1.5">
                Password
              </FieldLabel>
              <div className="relative">
                <Lock
                  className="h-4.5 w-4.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                />
                <Input
                  id="password"
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-11 text-sm rounded-xl"
                  aria-invalid={!!errors.password}
                  disabled={isSubmitting}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <FieldError className="mt-1 text-xs text-rose-600">{errors.password.message}</FieldError>
              )}
            </Field>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-sm shadow-rose-600/20 active:scale-[0.99] transition-all cursor-pointer mt-2 text-sm"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* Session Takeover ReUI Alert Dialog with Atelier Theme Preset */}
      <AlertDialog
        open={!!conflictSession}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) setConflictSession(null);
        }}
      >
        <AlertDialogContent className="rounded-3xl p-6 sm:max-w-[420px] gap-5 shadow-2xl shadow-rose-950/5 border border-rose-100/90 bg-white">
          <AlertDialogHeader className="sm:grid-cols-[auto_1fr] sm:text-left items-start gap-4">
            <AlertDialogMedia className="size-12 rounded-2xl bg-rose-50 border border-rose-200/90 text-rose-600 mb-0 row-span-2 shrink-0">
              <Smartphone className="size-6 text-rose-600" />
            </AlertDialogMedia>
            <AlertDialogTitle className="text-base font-bold text-slate-900 leading-snug">
              Active Session Detected
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500 leading-relaxed">
              Your account is currently active on{" "}
              <span className="font-semibold text-slate-900">
                {conflictSession?.activeDevice}
              </span>
              {conflictSession?.sessionStartedAt ? (
                <> since {new Date(conflictSession.sessionStartedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</>
              ) : null}
              . Continuing here will sign out that device.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="border-t border-rose-100/70 -mx-6 -mb-6 px-6 py-4 bg-gradient-to-b from-white to-rose-50/30 rounded-b-3xl flex items-center justify-end gap-2.5">
            <AlertDialogCancel
              onClick={() => setConflictSession(null)}
              disabled={isSubmitting}
              className="h-9 px-4 rounded-xl text-xs font-medium cursor-pointer border-slate-200 hover:bg-slate-50 hover:text-slate-900 text-slate-700"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleSubmit((vals) => performLogin(vals, true))();
              }}
              disabled={isSubmitting}
              className="h-9 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold cursor-pointer shadow-xs shadow-rose-600/25 active:scale-[0.99]"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Continue"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen bg-slate-50 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
