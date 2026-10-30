"use client";

import { KpiCards } from "@/components/dashboard/kpi-cards";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { SessionSecurityCard } from "@/components/dashboard/session-security-card";
import { OrdersVirtualTable } from "@/components/dashboard/orders-virtual-table";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* 1. Top KPI Summary */}
      <KpiCards />

      {/* 2. Atelier Revenue Trajectory & Active Session Security */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RevenueChart className="lg:col-span-2" />
        <SessionSecurityCard />
      </div>

      {/* 3. TanStack Virtualized Table for Atelier Garment Schedule */}
      <OrdersVirtualTable />
    </div>
  );
}
