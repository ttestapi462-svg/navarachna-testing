"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { 
  Palette, 
  ShoppingBag, 
  Users, 
  TrendingUp, 
  Activity, 
  CheckCircle2, 
  Lock,
  LogOut,
  Layers
} from "lucide-react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip 
} from "recharts";

// Zod schema for login form
const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const chartData = [
  { month: "Jan", orders: 28, revenue: 14500 },
  { month: "Feb", orders: 45, revenue: 23200 },
  { month: "Mar", orders: 60, revenue: 31000 },
  { month: "Apr", orders: 52, revenue: 28400 },
  { month: "May", orders: 78, revenue: 42100 },
  { month: "Jun", orders: 95, revenue: 53800 },
];

interface HealthStatus {
  status: string;
  service: string;
  framework: string;
  timestamp: string;
}

interface AuthStatus {
  isAuthenticated: boolean;
  user?: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  };
}

export default function DashboardPage() {
  const [authError, setAuthError] = useState<string | null>(null);

  // 1. Connectivity Query to Backend via Next.js Proxy
  const { data: health, isLoading: isHealthLoading, error: healthError } = useQuery<HealthStatus>({
    queryKey: ["health"],
    queryFn: () => apiClient<HealthStatus>("/health"),
    refetchInterval: 10000,
  });

  // 2. Auth State Query
  const { data: auth, refetch: refetchAuth } = useQuery<AuthStatus>({
    queryKey: ["authMe"],
    queryFn: async () => {
      try {
        return await apiClient<AuthStatus>("/api/auth/me");
      } catch {
        return { isAuthenticated: false };
      }
    },
  });

  // 3. React Hook Form + Zod
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "admin@navarachna.com",
      password: "Admin@1234",
    },
  });

  const onLogin = async (data: LoginFormValues) => {
    try {
      setAuthError(null);
      await apiClient("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      });
      await refetchAuth();
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "Authentication failed.");
    }
  };

  const onLogout = async () => {
    try {
      await apiClient("/api/auth/logout", { method: "POST" });
      await refetchAuth();
    } catch {
      // Ignored
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b bg-white shadow-xs sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-sm">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">Navarachna Designer Studio</h1>
              <p className="text-xs text-slate-500">Admin Operations & Design Studio Suite</p>
            </div>
          </div>

          {/* Backend Service Status Indicator */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-100 rounded-full px-3 py-1 text-xs">
              <span className={`h-2.5 w-2.5 rounded-full ${health?.status === "Healthy" ? "bg-emerald-500 animate-pulse" : "bg-amber-400"}`} />
              <span className="font-medium text-slate-700">
                {isHealthLoading ? "Connecting..." : health?.status === "Healthy" ? `.NET 10 API Connected` : "API Offline"}
              </span>
            </div>

            {auth?.isAuthenticated && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-700">{auth.user?.fullName}</span>
                <Button variant="outline" size="sm" onClick={onLogout} className="text-xs">
                  <LogOut className="h-3.5 w-3.5 mr-1" /> Logout
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Active Designs</CardTitle>
              <Palette className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">142</div>
              <p className="text-xs text-emerald-600 font-medium mt-1">+12% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Orders in Production</CardTitle>
              <ShoppingBag className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">38</div>
              <p className="text-xs text-emerald-600 font-medium mt-1">+8 new today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Studio Clients</CardTitle>
              <Users className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">894</div>
              <p className="text-xs text-slate-500 mt-1">98.4% retention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Monthly Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">$53,800</div>
              <p className="text-xs text-emerald-600 font-medium mt-1">+24.5% vs target</p>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Chart & Auth Verification Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Production Analytics Chart (Recharts) */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                Revenue & Design Volume
              </CardTitle>
              <CardDescription>Monthly studio performance metrics</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip />
                  <Area type="monotone" dataKey="revenue" stroke="#2563eb" fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Cookie Authentication & API Verification Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lock className="h-5 w-5 text-slate-700" />
                Cookie Auth & API Session
              </CardTitle>
              <CardDescription>
                {auth?.isAuthenticated 
                  ? "Logged in via 1st-party HTTP cookie" 
                  : "Sign in to test end-to-end ASP.NET Cookie Auth"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {auth?.isAuthenticated ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                    <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                      <CheckCircle2 className="h-4 w-4" /> Authenticated
                    </div>
                    <div className="mt-2 text-xs text-emerald-700 space-y-1">
                      <p><span className="font-semibold">User:</span> {auth.user?.fullName}</p>
                      <p><span className="font-semibold">Email:</span> {auth.user?.email}</p>
                      <p><span className="font-semibold">Role:</span> {auth.user?.role}</p>
                    </div>
                  </div>
                  <Button variant="destructive" onClick={onLogout} className="w-full">
                    Sign Out
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onLogin)} className="space-y-4">
                  {authError && (
                    <div className="p-3 text-xs bg-red-50 text-red-600 rounded-md border border-red-200">
                      {authError}
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Email Address</label>
                    <Input {...register("email")} placeholder="admin@navarachna.com" className="mt-1" />
                    {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Password</label>
                    <Input {...register("password")} type="password" placeholder="••••••••" className="mt-1" />
                    {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
                  </div>
                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? "Authenticating..." : "Sign In with Cookie Auth"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}
