"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { flexRender } from "@tanstack/react-table";
import {
  useLegacyTable as useTable,
  legacyCreateColumnHelper as createColumnHelper,
  getCoreRowModel,
} from "@tanstack/react-table/legacy";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import {
  Palette,
  ShoppingBag,
  Users,
  TrendingUp,
  CheckCircle2,
  Lock,
  LogOut,
  Layers,
  Smartphone,
  Monitor,
  Loader2,
  RefreshCw,
  Clock,
  UserCheck,
} from "lucide-react";

import {
  apiClient,
  clearStoredTokens,
  getStoredToken,
} from "@/lib/api-client";
import { initAuthHub } from "@/lib/auth-hub";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface HealthStatus {
  status: string;
  service: string;
  framework: string;
  timestamp: string;
}

interface UserDto {
  id: number;
  username: string;
  email?: string;
  firstName: string;
  lastName?: string;
  phoneNumber?: string;
  activeDeviceName?: string;
  sessionStartedAt?: string;
  createdAt?: string;
  createdBy?: number;
  updatedAt?: string;
  updatedBy?: number;
}

interface AuthMeResponse {
  isAuthenticated: boolean;
  user?: UserDto;
}

interface StudioOrder {
  id: string;
  client: string;
  garmentType: string;
  status: "In Cutting" | "Hand Embroidery" | "Final Fitting" | "Ready";
  designer: string;
  deadline: string;
}

const mockOrders: StudioOrder[] = Array.from({ length: 100 }, (_, i) => ({
  id: `NVR-${1000 + i}`,
  client: ["Aarav Mehta", "Diya Sharma", "Rohan Patel", "Ananya Reddy", "Vikram Malhotra"][i % 5],
  garmentType: ["Bespoke Sherwani", "Bridal Zardozi Lehenga", "Couture Tuxedo", "Hand-woven Anarkali", "Silk Sari Gown"][i % 5],
  status: (["In Cutting", "Hand Embroidery", "Final Fitting", "Ready"] as const)[i % 4],
  designer: ["Master Rajesh", "Atelier Priya", "Couturier Karan"][i % 3],
  deadline: `Oct ${20 + (i % 10)}, 2026`,
}));

const chartData = [
  { month: "Jan", orders: 28, revenue: 14500 },
  { month: "Feb", orders: 45, revenue: 23200 },
  { month: "Mar", orders: 60, revenue: 31000 },
  { month: "Apr", orders: 52, revenue: 28400 },
  { month: "May", orders: 78, revenue: 42100 },
  { month: "Jun", orders: 95, revenue: 53800 },
];

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // 1. Initial Client-Side Authentication Check: If no token, always open the login page
  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.replace("/login");
    } else {
      setIsAuthChecking(false);
    }
  }, [router]);

  // 1b. Real-Time Instant Kickoff via SignalR (<100ms push on session takeover/logout)
  useEffect(() => {
    if (isAuthChecking) return;

    const cleanup = initAuthHub(
      () => {
        clearStoredTokens();
        queryClient.setQueryData(["authMe"], { isAuthenticated: false });
        router.replace("/login?reason=session_superseded");
      },
      () => {
        clearStoredTokens();
        queryClient.setQueryData(["authMe"], { isAuthenticated: false });
        router.replace("/login?reason=session_terminated");
      }
    );

    return () => cleanup();
  }, [isAuthChecking, router, queryClient]);

  // 2. Backend Connectivity Query
  const { data: health, isLoading: isHealthLoading } = useQuery<HealthStatus>({
    queryKey: ["health"],
    queryFn: () => apiClient<HealthStatus>("/health"),
    refetchInterval: 15000,
    enabled: !isAuthChecking,
  });

  // 3. User Session & Profile Query with Adaptive Heartbeat (12s visible interval + instant on tab focus)
  const {
    data: auth,
    isLoading: isAuthLoading,
    refetch: refetchAuth,
  } = useQuery<AuthMeResponse>({
    queryKey: ["authMe"],
    queryFn: async () => {
      try {
        return await apiClient<AuthMeResponse>("/api/auth/me");
      } catch (err: unknown) {
        clearStoredTokens();
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("superseded")) {
          router.replace("/login?reason=session_superseded");
        } else if (msg.includes("terminated")) {
          router.replace("/login?reason=session_terminated");
        } else {
          router.replace("/login");
        }
        return { isAuthenticated: false };
      }
    },
    enabled: !isAuthChecking,
    refetchInterval: () => (typeof document !== "undefined" && document.hidden ? false : 12000),
    refetchOnWindowFocus: true,
    retry: false,
  });

  // Redirect if server says not authenticated
  useEffect(() => {
    if (!isAuthLoading && auth && !auth.isAuthenticated) {
      clearStoredTokens();
      router.replace("/login");
    }
  }, [isAuthLoading, auth, router]);

  // 4. Logout Handler
  const handleLogout = async () => {
    try {
      await apiClient("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore
    } finally {
      clearStoredTokens();
      queryClient.setQueryData(["authMe"], { isAuthenticated: false });
      router.replace("/login");
    }
  };

  // 5. TanStack Table Configuration for Studio Orders
  const columnHelper = createColumnHelper<StudioOrder>();
  const columns = useMemo(
    () => [
      columnHelper.accessor("id", {
        header: "Order #",
        cell: (info) => (
          <span className="font-mono font-semibold text-xs text-primary">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("client", {
        header: "Client Name",
        cell: (info) => (
          <span className="font-medium text-foreground text-xs">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("garmentType", {
        header: "Couture Garment",
        cell: (info) => (
          <span className="text-muted-foreground text-xs">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => {
          const val = info.getValue();
          const variant =
            val === "Ready"
              ? "success"
              : val === "Final Fitting"
              ? "default"
              : "secondary";
          return <Badge variant={variant}>{val}</Badge>;
        },
      }),
      columnHelper.accessor("designer", {
        header: "Lead Designer",
        cell: (info) => (
          <span className="text-muted-foreground text-xs">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("deadline", {
        header: "Fitting Deadline",
        cell: (info) => (
          <span className="text-muted-foreground/80 text-xs">{info.getValue()}</span>
        ),
      }),
    ],
    [columnHelper]
  );

  const table = useTable({
    data: mockOrders,
    columns: columns as never,
    getCoreRowModel: getCoreRowModel(),
  });

  const { rows } = table.getRowModel();
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // TanStack Virtualizer for large data (60fps smooth scrolling)
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 40,
    overscan: 10,
  });

  // Loading Screen: While checking authentication, show an elegant splash
  if (isAuthChecking || isAuthLoading || !auth?.isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="h-16 w-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4 animate-pulse">
          <Layers className="h-8 w-8" />
        </div>
        <p className="text-sm font-semibold text-foreground tracking-wide">
          Navarachna Designer Studio
        </p>
        <p className="text-xs text-primary mt-1 flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying Active Session...
        </p>
      </div>
    );
  }

  const currentUser = auth.user;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Top Studio Navbar */}
      <header className="border-b border-border/80 bg-card/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shadow-xs">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground leading-tight">
                Navarachna Designer Studio
              </h1>
              <p className="text-xs text-muted-foreground">
                Atelier Operations Suite · Single Active Session Protected
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Backend Connectivity Status */}
            <div className="flex items-center gap-2 bg-muted/60 rounded-full px-3 py-1 text-xs border border-border/40">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  health?.status === "Healthy"
                    ? "bg-emerald-500 animate-pulse"
                    : "bg-amber-400"
                }`}
              />
              <span className="font-medium text-foreground/80">
                {isHealthLoading
                  ? "Connecting..."
                  : health?.status === "Healthy"
                  ? ".NET 10 API Connected"
                  : "API Offline"}
              </span>
            </div>

            {/* Authenticated User & Logout */}
            {currentUser && (
              <div className="flex items-center gap-3 pl-2 border-l border-border/70">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-semibold text-foreground">
                    {currentUser.firstName} {currentUser.lastName || ""}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    @{currentUser.username}
                  </p>
                </div>

                <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-xs flex items-center justify-center">
                  {currentUser.firstName[0]}
                  {currentUser.lastName ? currentUser.lastName[0] : ""}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="rounded-3xl border-destructive/30 text-destructive hover:bg-destructive/10 text-xs h-8 px-2.5 cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5 mr-1" />
                  End Session
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Dashboard Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top KPI Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="rounded-4xl border border-border/70 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Couture Designs
              </CardTitle>
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Palette className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">142</div>
              <p className="text-xs text-emerald-600 font-medium mt-1">
                +12% from last month
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-4xl border border-border/70 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Orders in Atelier
              </CardTitle>
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <ShoppingBag className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">38</div>
              <p className="text-xs text-emerald-600 font-medium mt-1">
                8 ready for final fitting
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-4xl border border-border/70 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Studio VIP Clients
              </CardTitle>
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Users className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">894</div>
              <p className="text-xs text-muted-foreground mt-1">98.4% retention rate</p>
            </CardContent>
          </Card>

          <Card className="rounded-4xl border border-border/70 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Monthly Couture Revenue
              </CardTitle>
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <TrendingUp className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">$53,800</div>
              <p className="text-xs text-emerald-600 font-medium mt-1">
                +24.5% vs atelier target
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Analytics & Active Session Security Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Chart (Recharts) */}
          <Card className="lg:col-span-2 rounded-4xl border border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Atelier Revenue & Performance
              </CardTitle>
              <CardDescription>
                Monthly revenue trajectory rendered with Rose preset theme
              </CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e11d48" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#e11d48" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="currentColor" className="text-muted-foreground text-xs" />
                  <YAxis stroke="currentColor" className="text-muted-foreground text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      borderRadius: "1rem",
                      borderColor: "var(--border)",
                      color: "var(--card-foreground)",
                      boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#e11d48"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRev)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Active Session Status & Security Card */}
          <Card className="rounded-4xl border border-border/70 shadow-sm bg-card">
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
                    {currentUser?.activeDeviceName || "Web Dashboard"}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-foreground">
                  <UserCheck className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>
                    <strong>User:</strong> {currentUser?.firstName}{" "}
                    {currentUser?.lastName || ""} (@{currentUser?.username})
                  </span>
                </div>

                {currentUser?.email && (
                  <p className="text-muted-foreground pl-6">
                    <strong>Email:</strong> {currentUser.email}
                  </p>
                )}

                {currentUser?.sessionStartedAt && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4 text-muted-foreground/80 shrink-0" />
                    <span>
                      <strong>Session Started:</strong>{" "}
                      {new Date(currentUser.sessionStartedAt).toLocaleTimeString()}
                    </span>
                  </div>
                )}

                {currentUser?.createdAt && (
                  <p className="text-[10px] text-muted-foreground pl-6 border-t border-border/50 pt-2">
                    Account Created: {new Date(currentUser.createdAt).toLocaleDateString()}
                    {currentUser.updatedAt &&
                      ` · Updated: ${new Date(currentUser.updatedAt).toLocaleTimeString()}`}
                  </p>
                )}
              </div>

              <div className="p-3 rounded-2xl bg-muted/30 border border-border/40 text-[11px] text-muted-foreground flex items-start gap-2">
                <Smartphone className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>
                  <strong className="text-foreground">Force-Logout Protection:</strong> Signing into the Companion Mobile App will automatically and safely revoke this browser session.
                </span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchAuth()}
                  className="flex-1 text-xs rounded-3xl"
                >
                  <RefreshCw className="h-3 w-3 mr-1.5" /> Refresh State
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="flex-1 text-xs rounded-3xl border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-3 w-3 mr-1.5" /> End Session
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* TanStack Virtualized Table for Atelier Orders */}
        <Card className="rounded-4xl border border-border/70 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2 text-foreground">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Live Atelier Production Schedule
                </CardTitle>
                <CardDescription>
                  High-performance TanStack Virtualized Table (100 active garments rendering at 60fps)
                </CardDescription>
              </div>
              <Badge variant="outline">TanStack Virtual 3.14</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div
              ref={tableContainerRef}
              className="h-80 overflow-auto border border-border/70 rounded-3xl bg-card relative"
            >
              <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: "100%", position: "relative" }}>
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-muted/60 sticky top-0 z-10 border-b border-border/70 shadow-2xs">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <th key={header.id} className="p-3 font-semibold text-foreground/80">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                      const row = rows[virtualRow.index];
                      return (
                        <tr
                          key={row.id}
                          className="hover:bg-muted/30 border-b border-border/40 transition-colors"
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: `${virtualRow.size}px`,
                            transform: `translateY(${virtualRow.start}px)`,
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <td key={cell.id} className="p-3 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
