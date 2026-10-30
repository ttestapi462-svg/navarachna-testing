"use client";

import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
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
    <div className="relative h-screen w-full flex flex-col justify-center items-center bg-[#FAF7F2] overflow-hidden selection:bg-[#C59B4E]/30 selection:text-[#581124] px-4">
      {/* Background Graphic Plate matching reference */}
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-no-repeat bg-center bg-cover"
        style={{
          backgroundImage: "url('/assets/clean-bg.png')",
        }}
      />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-[436px] flex flex-col items-center -mt-2">
        {/* Brand Logo Monogram - No Background (Transparent cream background & 3D Gold matching text) */}
        <div className="mb-1 flex flex-col items-center select-none">
          <div className="relative w-[102px] h-[102px] sm:w-[114px] sm:h-[114px] flex items-center justify-center drop-shadow-[0_4px_10px_rgba(88,17,36,0.22)] transition-transform duration-300 hover:scale-105">
            <Image
              src="/assets/navarachna-needle-gold-square.png"
              alt="Navarachna Needle & Thread Monogram"
              width={114}
              height={114}
              priority
              className="object-contain w-full h-full"
            />
          </div>
        </div>

        {/* 3D Embossed Gold Brand Text from Official Logo (Preserved authentic gold design) */}
        <div className="mb-2 flex flex-col items-center select-none">
          <div className="relative w-[275px] sm:w-[300px] aspect-[799/308] drop-shadow-[0_2px_4px_rgba(88,17,36,0.28)] transition-transform duration-300 hover:scale-[1.01]">
            <Image
              src="/assets/navarachna-3d-text-perfect.png"
              alt="Navarachna Designer Studio"
              fill
              priority
              className="object-contain"
            />
          </div>

          <p className="text-[#6E6862] font-sans text-[13px] sm:text-[13.5px] mt-0.5 font-normal">
            Sign in to continue to your account
          </p>
        </div>

        {/* Login Card */}
        <div className="w-full bg-white rounded-[22px] px-8 py-7 studio-card-shadow border border-white/60">
          {/* Session Transfer / Expiry Alerts (Temporary: vanishes on page reload or dismiss) */}
          {displayedReason === "session_superseded" && (
            <Alert className="mb-4 relative border-rose-200 bg-rose-50 text-slate-900 rounded-xl p-3 pr-8 shadow-xs animate-in fade-in duration-300">
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
            <Alert className="mb-4 relative rounded-xl border-slate-200 bg-slate-50 p-3 pr-8 shadow-xs animate-in fade-in duration-300">
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
            <Alert className="mb-4 relative rounded-xl border-slate-200 bg-slate-50 p-3 pr-8 shadow-xs animate-in fade-in duration-300">
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
            className="space-y-4"
          >
            {/* Error Notification */}
            {authError && (
              <div className="p-2.5 text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{authError}</span>
              </div>
            )}

            {/* Username / Identifier Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="identifier"
                className="block text-[13px] font-medium text-slate-700"
              >
                Username
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center">
                  <UserIcon className="h-4 w-4 stroke-[1.6]" />
                </div>
                <input
                  {...register("identifier")}
                  id="identifier"
                  type="text"
                  placeholder="Enter your username"
                  className="w-full h-[46px] pl-10 pr-3.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-[13.5px] placeholder:text-slate-400 focus:outline-none focus:border-[#C59B4E] focus:ring-1 focus:ring-[#C59B4E] transition-all duration-150"
                />
              </div>
              {errors.identifier && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.identifier.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-[13px] font-medium text-slate-700"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center">
                  <Lock className="h-4 w-4 stroke-[1.6]" />
                </div>
                <input
                  {...register("password")}
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="w-full h-[46px] pl-10 pr-10 rounded-lg border border-slate-200 bg-white text-slate-800 text-[13.5px] placeholder:text-slate-400 focus:outline-none focus:border-[#C59B4E] focus:ring-1 focus:ring-[#C59B4E] transition-all duration-150"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-0.5 cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 stroke-[1.6]" />
                  ) : (
                    <Eye className="h-4 w-4 stroke-[1.6]" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Remember me & Forgot Password Row */}
            <div className="flex items-center justify-between text-[13px] pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none group">
                <div
                  onClick={() => setRememberMe(!rememberMe)}
                  className={`w-4 h-4 rounded flex items-center justify-center border transition-all duration-150 ${
                    rememberMe
                      ? "bg-[#C59B4E] border-[#C59B4E] text-white shadow-xs"
                      : "border-slate-300 bg-white group-hover:border-slate-400"
                  }`}
                >
                  {rememberMe && <Check className="h-3 w-3 stroke-[3]" />}
                </div>
                <span className="text-slate-600 group-hover:text-slate-800 transition-colors text-[13px]">
                  Remember me
                </span>
              </label>

              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-[#C59B4E] hover:text-[#A88038] font-normal transition-colors underline underline-offset-4 decoration-[#C59B4E]/40 hover:decoration-[#C59B4E] text-[13px] cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 mt-2 rounded-lg bg-[#581124] hover:bg-[#480E1D] active:bg-[#3C0A17] disabled:opacity-70 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition-all duration-150 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4 stroke-[2]" />
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
              className="bg-[#581124] hover:bg-[#480E1D] text-white"
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
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold text-[#581124]">
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
                  className="w-full h-9 rounded-lg bg-[#581124] text-white text-xs font-medium mt-2"
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
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-[#C59B4E] focus:ring-1 focus:ring-[#C59B4E]"
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
                    className="flex-1 h-9 rounded-lg bg-[#581124] hover:bg-[#480E1D] text-white text-xs font-medium shadow-xs"
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
      fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-[#FAF7F2]">
          <Loader2 className="h-8 w-8 animate-spin text-[#581124]" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
