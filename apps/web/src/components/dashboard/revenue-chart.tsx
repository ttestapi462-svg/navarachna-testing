"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const chartData = [
  { month: "Jan", orders: 28, revenue: 14500 },
  { month: "Feb", orders: 45, revenue: 23200 },
  { month: "Mar", orders: 60, revenue: 31000 },
  { month: "Apr", orders: 52, revenue: 28400 },
  { month: "May", orders: 78, revenue: 42100 },
  { month: "Jun", orders: 95, revenue: 53800 },
];

export function RevenueChart({ className }: { className?: string }) {
  return (
    <Card className={cn("rounded-4xl border border-border/70 shadow-sm", className)}>
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
            <XAxis
              dataKey="month"
              stroke="currentColor"
              className="text-muted-foreground text-xs"
            />
            <YAxis
              stroke="currentColor"
              className="text-muted-foreground text-xs"
            />
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
  );
}
