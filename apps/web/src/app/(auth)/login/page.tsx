"use client";

import { useState, useEffect, Suspense } from "react";
import { StudioBrandMark } from "@/components/brand/studio-logo";
import { StudioLoader } from "@/components/brand/studio-loader";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  AlertCircle,
  Check,
  ArrowRight,
  Loader2,
  X,
  Smartphone,
} from "lucide-react";

import {
  apiClient,
  setStoredTokens,
  getStoredToken,
  clearStoredTokens,
  ApiError,
} from "@/lib/api-client";
import { loginSchema, type LoginFormValues } from "@/lib/validations/auth";
import { toast } from "@/components/ui/sonner";
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

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [displayedReason, setDisplayedReason] = useState<string | null>(() =>
    searchParams.get("reason")
  );
  const [conflictSession, setConflictSession] = useState<{
    activeDevice: string;
    sessionStartedAt?: string;
  } | null>(null);

  // If reason is present (superseded, terminated, expired), clear stale tokens
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
      identifier: "admin@navarachna.com",
      password: "Admin@1234",
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
        toast.success("Welcome back!", {
          description: "Signed in to Navarachna Designer Studio.",
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
    const firstMsg = Object.values(fieldErrors).find((e) => e?.message)?.message;
    toast.warning("Please review required fields", {
      description: typeof firstMsg === "string" ? firstMsg : "Please enter your username and password.",
    });
  };

  return (
    <div className="relative h-screen w-full flex flex-col justify-center items-center bg-background overflow-hidden px-4">
      {/* Background Graphic Plate matching reference */}
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-no-repeat bg-center bg-cover"
        style={{
          backgroundImage: "url('/assets/clean-bg.png')",
        }}
      />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-[370px] flex flex-col items-center py-4">
        {/* Official Brand Logo Mark — Compact Atelier Crest */}
        <div className="mb-2.5 flex flex-col items-center select-none text-center">
          <StudioBrandMark variant="full" height={132} priority />
          <p className="text-muted-foreground font-sans text-xs mt-1.5 font-normal tracking-wide">
            Sign in to continue to your account
          </p>
        </div>

        {/* Login Card — Compact, Clean & Consistent with Atelier Design Rules */}
        <div className="w-full bg-card text-card-foreground rounded-2xl p-5 sm:p-6 shadow-md shadow-black/4 border border-border/70 backdrop-blur-xs">
          {/* Session Transfer / Expiry Alerts */}
          {displayedReason === "session_superseded" && (
            <Alert className="mb-3 relative border-rose-200 bg-rose-50 text-slate-900 rounded-lg p-2.5 pr-7 shadow-xs animate-in fade-in duration-300">
              <AlertCircle className="size-3.5 text-rose-600 shrink-0" />
              <div>
                <AlertTitle className="text-slate-900 text-[11px] font-semibold">
                  Session Transferred
                </AlertTitle>
                <AlertDescription className="text-slate-600 text-[10px] mt-0.5">
                  Your account was logged in on another device.
                </AlertDescription>
              </div>
              <button
                type="button"
                onClick={() => setDisplayedReason(null)}
                className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded"
                aria-label="Dismiss notice"
              >
                <X className="size-3" />
              </button>
            </Alert>
          )}

          {displayedReason === "expired" && (
            <Alert className="mb-3 relative rounded-lg border-border bg-muted/60 p-2.5 pr-7 shadow-xs animate-in fade-in duration-300">
              <Lock className="size-3.5 text-muted-foreground shrink-0" />
              <div>
                <AlertTitle className="text-foreground text-[11px] font-semibold">
                  Session Expired
                </AlertTitle>
                <AlertDescription className="text-muted-foreground text-[10px] mt-0.5">
                  Please sign in again to continue.
                </AlertDescription>
              </div>
              <button
                type="button"
                onClick={() => setDisplayedReason(null)}
                className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded"
                aria-label="Dismiss notice"
              >
                <X className="size-3" />
              </button>
            </Alert>
          )}

          {displayedReason === "session_terminated" && (
            <Alert className="mb-3 relative rounded-lg border-border bg-muted/60 p-2.5 pr-7 shadow-xs animate-in fade-in duration-300">
              <Lock className="size-3.5 text-muted-foreground shrink-0" />
              <div>
                <AlertTitle className="text-foreground text-[11px] font-semibold">
                  Signed Out
                </AlertTitle>
                <AlertDescription className="text-muted-foreground text-[10px] mt-0.5">
                  Your session has ended. Please sign in to resume.
                </AlertDescription>
              </div>
              <button
                type="button"
                onClick={() => setDisplayedReason(null)}
                className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded"
                aria-label="Dismiss notice"
              >
                <X className="size-3" />
              </button>
            </Alert>
          )}

          <form
            noValidate
            onSubmit={handleSubmit(onSubmit, onInvalid)}
            className="space-y-3.5"
          >
            {/* Error Notification */}
            {authError && (
              <div className="p-2 text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
                <AlertCircle className="size-3.5 shrink-0 text-red-600" />
                <span>{authError}</span>
              </div>
            )}

            {/* Username / Identifier Field */}
            <div className="space-y-1">
              <label
                htmlFor="identifier"
                className="block text-xs font-medium text-foreground/90"
              >
                Username
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 pointer-events-none flex items-center">
                  <UserIcon className="size-3.5 stroke-[1.8]" />
                </div>
                <input
                  {...register("identifier")}
                  id="identifier"
                  type="text"
                  placeholder="Enter your username"
                  className="w-full h-9.5 pl-8.5 pr-3 rounded-lg border border-input bg-background/50 text-foreground text-xs placeholder:text-muted-foreground/60 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all duration-150"
                />
              </div>
              {errors.identifier && (
                <p className="text-[11px] text-destructive mt-0.5">
                  {errors.identifier.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label
                htmlFor="password"
                className="block text-xs font-medium text-foreground/90"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 pointer-events-none flex items-center">
                  <Lock className="size-3.5 stroke-[1.8]" />
                </div>
                <input
                  {...register("password")}
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="w-full h-9.5 pl-8.5 pr-8.5 rounded-lg border border-input bg-background/50 text-foreground text-xs placeholder:text-muted-foreground/60 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all duration-150"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground transition-colors p-1 cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="size-3.5 stroke-[1.8]" />
                  ) : (
                    <Eye className="size-3.5 stroke-[1.8]" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] text-destructive mt-0.5">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Remember me & Forgot Password Row */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center gap-1.5 cursor-pointer select-none group">
                <div
                  onClick={() => setRememberMe(!rememberMe)}
                  className={`size-3.5 rounded flex items-center justify-center border transition-all duration-150 ${
                    rememberMe
                      ? "bg-brand-gold border-brand-gold text-white shadow-xs"
                      : "border-input bg-background/50 group-hover:border-slate-400"
                  }`}
                >
                  {rememberMe && <Check className="size-2.5 stroke-[3]" />}
                </div>
                <span className="text-muted-foreground group-hover:text-foreground transition-colors text-xs">
                  Remember me
                </span>
              </label>

              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-brand-gold hover:text-brand-gold-hover font-normal transition-colors underline underline-offset-4 decoration-brand-gold/40 hover:decoration-brand-gold text-xs cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-9.5 mt-1 rounded-lg bg-primary hover:bg-brand-maroon-hover active:bg-brand-maroon-active disabled:opacity-70 text-primary-foreground font-medium text-xs flex items-center justify-center gap-2 shadow-xs transition-all duration-150 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin text-white" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="size-3.5 stroke-[2]" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Conflict Session Dialog */}
      <AlertDialog
        open={!!conflictSession}
        onOpenChange={(open) => !open && setConflictSession(null)}
      >
        <AlertDialogContent className="max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-amber-100 text-amber-900">
              <Smartphone className="size-6 text-amber-700" />
            </AlertDialogMedia>
            <AlertDialogTitle>Account In Use on Another Device</AlertDialogTitle>
            <AlertDialogDescription>
              Your account is currently active on{" "}
              <strong className="text-foreground">
                {conflictSession?.activeDevice}
              </strong>
              {conflictSession?.sessionStartedAt
                ? ` (signed in at ${new Date(conflictSession.sessionStartedAt).toLocaleTimeString()})`
                : ""}
              . Would you like to terminate that session and sign in here?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-primary hover:bg-brand-maroon-hover text-primary-foreground"
              onClick={() => {
                handleSubmit((values) => performLogin(values, true))();
              }}
            >
              Sign In Here (End Other)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground rounded-2xl max-w-sm w-full p-6 shadow-xl border border-border space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold text-primary">
                Reset Password
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(false);
                  setForgotSubmitted(false);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {forgotSubmitted ? (
              <div className="space-y-3 py-2 text-center">
                <div className="mx-auto w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Check className="h-5 w-5 stroke-[2.5]" />
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  A password reset link has been dispatched to{" "}
                  <span className="font-semibold text-slate-800">{forgotEmail}</span> if it is registered in our atelier system.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(false);
                    setForgotSubmitted(false);
                  }}
                  className="w-full h-9 rounded-lg bg-primary hover:bg-brand-maroon-hover text-primary-foreground text-xs font-medium mt-2"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (forgotEmail) setForgotSubmitted(true);
                }}
                className="space-y-3"
              >
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enter your registered username or email address and our concierge will provide a secure recovery link.
                </p>
                <div className="space-y-1">
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@navarachna.com"
                    className="w-full h-10 px-3 rounded-lg border border-input bg-card text-xs text-foreground focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 h-9 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 h-9 rounded-lg bg-primary hover:bg-brand-maroon-hover text-primary-foreground text-xs font-medium shadow-xs"
                  >
                    Send Link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={<StudioLoader size={120} />}
    >
      <LoginContent />
    </Suspense>
  );
}
