"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import {
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
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
import { AtelierShowcaseCarousel } from "@/components/atelier-showcase-carousel";
import { StudioBrandMark } from "@/components/brand/studio-logo";

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

  const onInvalid = (fieldErrors: FieldErrors<LoginFormValues>) => {
    const errorCount = Object.keys(fieldErrors).length;
    const firstMsg = Object.values(fieldErrors).find((e) => e?.message)?.message;
    toast.warning("Please check required fields", {
      description:
        typeof firstMsg === "string"
          ? firstMsg
          : `Please review ${errorCount} incomplete or invalid field${errorCount > 1 ? "s" : ""}.`,
    });
  };

  return (
    <div className="min-h-screen w-screen lg:h-screen lg:max-h-screen lg:overflow-hidden overflow-y-auto grid grid-cols-1 lg:grid-cols-2 bg-slate-50 font-sans select-none">
      {/* LEFT HALF: Complete Full-Bleed Haute Couture Atelier Carousel */}
      <div className="hidden lg:block relative h-full w-full overflow-hidden select-none bg-slate-950 border-r border-rose-950/20">
        <AtelierShowcaseCarousel />
      </div>

      {/* RIGHT HALF: Refined & Compact Sign In Panel */}
      <div className="flex flex-col justify-between min-h-screen lg:min-h-0 lg:h-full p-6 sm:p-8 lg:p-10 xl:p-14 bg-white relative overflow-y-auto lg:overflow-hidden">
        {/* Center: Compact & Refined Sign-in Form Container */}
        <div className="max-w-[380px] xl:max-w-[400px] w-full mx-auto my-auto space-y-5">
          <div className="pb-1">
            <StudioBrandMark variant="horizontal" height={48} gap={16} priority />
          </div>
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

          <form
            noValidate
            onSubmit={handleSubmit(onSubmit, onInvalid)}
            className="space-y-3.5 pt-0.5"
          >
            {authError && (
              <div className="rounded-xl border border-destructive/25 bg-destructive/10 p-3 flex items-start gap-2.5 text-xs text-destructive animate-in fade-in-0 duration-200">
                <AlertCircle className="size-4 shrink-0 mt-0.5 text-destructive" />
                <div className="flex-1">
                  <p className="font-semibold text-destructive">Authentication Error</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-destructive/90">
                    {authError}
                  </p>
                </div>
              </div>
            )}

            {/* ReUI Field: Username or Email with InputGroup & Dynamic Error State */}
            <Field className="gap-1">
              <FieldLabel
                htmlFor="identifier"
                className={cn(
                  "text-xs font-semibold tracking-tight transition-colors",
                  errors.identifier ? "text-destructive" : "text-foreground/85"
                )}
              >
                Username or Email <span className="text-destructive font-bold">*</span>
              </FieldLabel>
              <InputGroup
                aria-invalid={!!errors.identifier}
                className={cn(
                  "h-10 transition-all rounded-xl",
                  errors.identifier
                    ? "border-destructive ring-2 ring-destructive/20 focus-within:border-destructive focus-within:ring-destructive/20"
                    : "focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15"
                )}
              >
                <InputGroupAddon>
                  <User
                    className={cn(
                      "size-4 transition-colors",
                      errors.identifier ? "text-destructive" : "text-muted-foreground/70"
                    )}
                  />
                </InputGroupAddon>
                <InputGroupInput
                  id="identifier"
                  {...register("identifier")}
                  placeholder="admin or admin@navarachna.com"
                  className="text-xs sm:text-sm placeholder:text-muted-foreground/60 h-10"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.identifier}
                  autoComplete="username"
                />
              </InputGroup>
              {errors.identifier && (
                <FieldError className="text-[11px] font-medium text-destructive flex items-center gap-1 mt-0.5 animate-in fade-in-0 duration-150">
                  <AlertCircle className="size-3 shrink-0" />
                  <span>{errors.identifier.message}</span>
                </FieldError>
              )}
            </Field>

            {/* ReUI Field: Password with InputGroup & Trailing Toggle Eye */}
            <Field className="gap-1">
              <FieldLabel
                htmlFor="password"
                className={cn(
                  "text-xs font-semibold tracking-tight transition-colors",
                  errors.password ? "text-destructive" : "text-foreground/85"
                )}
              >
                Password <span className="text-destructive font-bold">*</span>
              </FieldLabel>
              <InputGroup
                aria-invalid={!!errors.password}
                className={cn(
                  "h-10 transition-all rounded-xl",
                  errors.password
                    ? "border-destructive ring-2 ring-destructive/20 focus-within:border-destructive focus-within:ring-destructive/20"
                    : "focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15"
                )}
              >
                <InputGroupAddon>
                  <Lock
                    className={cn(
                      "size-4 transition-colors",
                      errors.password ? "text-destructive" : "text-muted-foreground/70"
                    )}
                  />
                </InputGroupAddon>
                <InputGroupInput
                  id="password"
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="text-xs sm:text-sm placeholder:text-muted-foreground/60 h-10"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.password}
                  autoComplete="current-password"
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    type="button"
                    size="icon-xs"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-muted-foreground/70 hover:text-foreground cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              {errors.password && (
                <FieldError className="text-[11px] font-medium text-destructive flex items-center gap-1 mt-0.5 animate-in fade-in-0 duration-150">
                  <AlertCircle className="size-3 shrink-0" />
                  <span>{errors.password.message}</span>
                </FieldError>
              )}
            </Field>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-xs sm:text-sm shadow-xs cursor-pointer active:scale-[0.99] transition-all mt-2"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
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
