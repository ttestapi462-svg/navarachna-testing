"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/reui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useCustomerSummary,
  useCustomerPayments,
  useCustomerMeasurements,
} from "@/services/customer-service";
import type { Customer } from "@/types/customer";
import { WhatsAppIcon } from "@/components/brand/whatsapp-icon";
import {
  Phone,
  MessageCircle,
  MapPin,
  Pencil,
  Trash2,
  Calendar,
  CreditCard,
  ShoppingBag,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  User,
  Loader2,
} from "lucide-react";

interface CustomerProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
}

export function CustomerProfileSheet({
  open,
  onOpenChange,
  customer,
  onEdit,
  onDelete,
}: CustomerProfileSheetProps) {
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("summary");

  const customerId = customer?.id || 0;
  const { data: summary, isLoading: isSummaryLoading } =
    useCustomerSummary(customerId);
  const { data: payments = [], isLoading: isPaymentsLoading } =
    useCustomerPayments(customerId);
  const { data: measurements = [], isLoading: isMeasurementsLoading } =
    useCustomerMeasurements(customerId);

  if (!customer) return null;

  const memberSince = customer.createdAt
    ? new Date(customer.createdAt).toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Recent";

  const cleanPhone = (customer.whatsappNumber || customer.mobileNumber).replace(
    /[^0-9]/g,
    ""
  );
  const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const whatsappUrl = `https://wa.me/${waPhone}`;

  const fullAddress = [customer.address, customer.area, customer.city]
    .filter(Boolean)
    .join(", ");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full sm:max-w-2xl data-[side=right]:sm:max-w-2xl lg:max-w-3xl data-[side=right]:lg:max-w-3xl p-0 flex flex-col bg-card border-l border-border shadow-2xl overflow-hidden z-50"
      >
        {/* Atelier Ultra-Compact Profile Header (Integrated 1-Tier Layout) */}
        <div className="relative border-b border-border/70 bg-gradient-to-b from-muted/30 via-background to-background px-4 py-2.5 sm:px-5 sm:py-2.5">
          <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
            {/* Left: Title + Status + Meta Inline */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight truncate">
                  {customer.name}
                </h2>
                <Badge
                  variant={customer.isActive ? "success-light" : "outline"}
                  size="xs"
                  radius="full"
                  className={`font-medium text-[9.5px] gap-1 px-1.5 py-0 ${
                    customer.isActive
                      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-400"
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${
                      customer.isActive
                        ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]"
                        : "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.4)]"
                    }`}
                  />
                  <span>{customer.isActive ? "Active" : "Inactive"}</span>
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                <span className="flex items-center gap-1 shrink-0">
                  <Calendar className="size-3" />
                  <span>Since {memberSince}</span>
                </span>
                {customer.city && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="size-3 shrink-0" />
                      <span className="truncate">{customer.city}</span>
                    </span>
                  </>
                )}
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setDetailsExpanded(!detailsExpanded)}
                  className="text-primary hover:underline font-medium inline-flex items-center gap-0.5 cursor-pointer"
                >
                  <span>{detailsExpanded ? "Less Details" : "More Details"}</span>
                  {detailsExpanded ? (
                    <ChevronUp className="size-3" />
                  ) : (
                    <ChevronDown className="size-3" />
                  )}
                </button>
              </div>
            </div>

            {/* Right: Quick Action Contact Strip + Edit/Delete */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={`tel:${customer.mobileNumber}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-border/70 bg-card hover:bg-muted text-foreground/90 transition-colors shadow-2xs font-mono"
                  >
                    <Phone className="size-3 text-muted-foreground shrink-0" />
                    <span>{customer.mobileNumber}</span>
                  </a>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Call {customer.mobileNumber}</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 transition-colors shadow-2xs"
                  >
                    <WhatsAppIcon className="size-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>WhatsApp</span>
                  </a>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Open WhatsApp chat</p>
                </TooltipContent>
              </Tooltip>

              <div className="h-4 w-px bg-border/60 mx-0.5" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => {
                      onOpenChange(false);
                      onEdit(customer);
                    }}
                    className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors"
                    aria-label="Edit Customer"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Edit profile</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => {
                      onOpenChange(false);
                      onDelete(customer);
                    }}
                    className="size-7 rounded-lg text-destructive/80 hover:text-destructive hover:bg-destructive/10 cursor-pointer transition-colors"
                    aria-label="Delete Customer"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Delete profile</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Collapsible Details Drawer - Tabulated Alignment without Border */}
          {detailsExpanded && (
            <div className="mt-2 pt-2 text-[11px] animate-in fade-in-50 duration-200">
              <div className="grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-1.5 items-start">
                {fullAddress && (
                  <>
                    <div className="flex items-center gap-1.5 font-semibold text-foreground whitespace-nowrap">
                      <MapPin className="size-3 text-primary shrink-0" />
                      <span>Full Address:</span>
                    </div>
                    <div className="text-muted-foreground break-words leading-relaxed">
                      {fullAddress}
                    </div>
                  </>
                )}

                {customer.alternateMobile && (
                  <>
                    <div className="flex items-center gap-1.5 font-semibold text-foreground whitespace-nowrap">
                      <Phone className="size-3 text-muted-foreground shrink-0" />
                      <span>Alternate Phone:</span>
                    </div>
                    <div className="font-mono">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a
                            href={`tel:${customer.alternateMobile}`}
                            className="text-primary hover:underline font-medium inline-block"
                          >
                            {customer.alternateMobile}
                          </a>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p className="text-xs">Call {customer.alternateMobile}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </>
                )}

                {customer.remarks && (
                  <>
                    <div className="flex items-center gap-1.5 font-semibold text-foreground whitespace-nowrap">
                      <FileText className="size-3 text-amber-600 shrink-0" />
                      <span>Atelier Notes:</span>
                    </div>
                    <div className="text-muted-foreground break-words leading-relaxed">
                      {customer.remarks}
                    </div>
                  </>
                )}

                {(customer.updatedByUsername || customer.createdByUsername) && (
                  <>
                    <div className="flex items-center gap-1.5 font-semibold text-foreground whitespace-nowrap">
                      <User className="size-3 text-primary shrink-0" />
                      <span>Audit Trail:</span>
                    </div>
                    <div className="text-muted-foreground break-words">
                      {customer.updatedByUsername
                        ? `Last updated by ${customer.updatedByUsername}`
                        : `Enrolled by ${customer.createdByUsername}`}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 4 Summary Stats — Ultra-Compact Segmented Atelier Strip */}
        <div className="px-4 py-2 sm:px-5 bg-muted/10 border-b border-border/60">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border/60 rounded-xl border border-border/70 bg-card/90 shadow-2xs overflow-hidden">
            {/* Stat 1: Total Orders */}
            <div className="flex items-center gap-2.5 p-2 sm:px-3 sm:py-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/15">
                <ShoppingBag className="size-3.5 stroke-[1.8]" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider leading-tight truncate">
                  Total Orders
                </div>
                <div className="text-xs sm:text-sm font-bold font-mono text-foreground leading-tight mt-0.5">
                  {isSummaryLoading ? "..." : summary?.totalOrders ?? 0}
                </div>
              </div>
            </div>

            {/* Stat 2: Total Spend */}
            <div className="flex items-center gap-2.5 p-2 sm:px-3 sm:py-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/15">
                <CreditCard className="size-3.5 stroke-[1.8]" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider leading-tight truncate">
                  Total Spend
                </div>
                <div className="text-xs sm:text-sm font-bold font-mono text-foreground leading-tight mt-0.5 truncate">
                  ₹{isSummaryLoading
                    ? "..."
                    : (summary?.totalBusinessValue ?? 0).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                </div>
              </div>
            </div>

            {/* Stat 3: Total Paid */}
            <div className="flex items-center gap-2.5 p-2 sm:px-3 sm:py-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15">
                <CheckCircle2 className="size-3.5 stroke-[1.8]" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider leading-tight truncate">
                  Total Paid
                </div>
                <div className="text-xs sm:text-sm font-bold font-mono text-foreground leading-tight mt-0.5 truncate">
                  ₹{isSummaryLoading
                    ? "..."
                    : (summary?.totalPaid ?? 0).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                </div>
              </div>
            </div>

            {/* Stat 4: Outstanding */}
            <div
              className={cn(
                "flex items-center gap-2.5 p-2 sm:px-3 sm:py-2 transition-colors",
                (summary?.outstandingBalance ?? 0) > 0 ? "bg-destructive/5" : ""
              )}
            >
              <div
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-lg border",
                  (summary?.outstandingBalance ?? 0) > 0
                    ? "bg-destructive/15 text-destructive border-destructive/25"
                    : "bg-muted/80 text-muted-foreground border-border/60"
                )}
              >
                {(summary?.outstandingBalance ?? 0) > 0 ? (
                  <AlertCircle className="size-3.5 stroke-[1.8]" />
                ) : (
                  <CheckCircle2 className="size-3.5 stroke-[1.8]" />
                )}
              </div>
              <div className="min-w-0">
                <div
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-wider leading-tight truncate",
                    (summary?.outstandingBalance ?? 0) > 0
                      ? "text-destructive"
                      : "text-muted-foreground"
                  )}
                >
                  Outstanding
                </div>
                <div
                  className={cn(
                    "text-xs sm:text-sm font-bold font-mono leading-tight mt-0.5 truncate",
                    (summary?.outstandingBalance ?? 0) > 0
                      ? "text-destructive"
                      : "text-foreground"
                  )}
                >
                  ₹{isSummaryLoading
                    ? "..."
                    : (summary?.outstandingBalance ?? 0).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detail Tabs with REUI Line Variant and Count Badges (@reui/c-tabs-7) */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-background">
          <Tabs
            defaultValue="orders"
            className="w-full flex-1 min-h-0 flex flex-col gap-0"
          >
            {/* Edge-to-edge tabs header */}
            <div className="w-full shrink-0 border-b border-border/70 bg-card/60 backdrop-blur-xs">
              <TabsList
                variant="line"
                className="grid grid-cols-3 w-full gap-0 p-0 h-11 border-b-0 bg-transparent rounded-none"
              >
                <TabsTrigger
                  value="orders"
                  className="w-full justify-center gap-2 cursor-pointer text-xs sm:text-sm font-medium h-full"
                >
                  <ShoppingBag className="size-3.5" />
                  <span>Orders</span>
                  <Badge variant="primary-light" size="sm" className="font-mono">
                    {summary?.totalOrders ?? 0}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="measurements"
                  className="w-full justify-center gap-2 cursor-pointer text-xs sm:text-sm font-medium h-full"
                >
                  <FileText className="size-3.5" />
                  <span>Measurements</span>
                  <Badge variant="info-light" size="sm" className="font-mono">
                    {measurements.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="payments"
                  className="w-full justify-center gap-2 cursor-pointer text-xs sm:text-sm font-medium h-full"
                >
                  <CreditCard className="size-3.5" />
                  <span>Payments</span>
                  <Badge variant="success-light" size="sm" className="font-mono">
                    {payments.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB: Orders */}
            <TabsContent
              value="orders"
              className="flex-1 min-h-0 m-0 p-4 sm:p-5 flex flex-col overflow-y-auto data-[state=inactive]:hidden"
            >
              <Card className="flex-1 w-full border border-dashed border-border/80 bg-muted/10 shadow-none flex flex-col items-center justify-center min-h-[300px]">
                <CardContent className="p-8 text-center space-y-3 flex flex-col items-center justify-center max-w-sm mx-auto">
                  <div className="size-14 rounded-2xl bg-muted/50 border border-border/60 flex items-center justify-center shadow-2xs">
                    <ShoppingBag className="size-7 text-muted-foreground stroke-[1.5]" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      No orders recorded yet
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Orders placed by {customer.name} will be tracked here with
                      delivery dates, fitting stages, and balance amounts.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: Measurements */}
            <TabsContent
              value="measurements"
              className="flex-1 min-h-0 m-0 p-4 sm:p-5 flex flex-col overflow-y-auto data-[state=inactive]:hidden"
            >
              {isMeasurementsLoading ? (
                <div className="flex-1 flex items-center justify-center p-8 text-center text-xs text-muted-foreground">
                  <Loader2 className="size-5 animate-spin mr-2 text-primary" />
                  Loading measurements...
                </div>
              ) : measurements.length === 0 ? (
                <Card className="flex-1 w-full border border-dashed border-border/80 bg-muted/10 shadow-none flex flex-col items-center justify-center min-h-[300px]">
                  <CardContent className="p-8 text-center space-y-3 flex flex-col items-center justify-center max-w-sm mx-auto">
                    <div className="size-14 rounded-2xl bg-muted/50 border border-border/60 flex items-center justify-center shadow-2xs">
                      <FileText className="size-7 text-muted-foreground stroke-[1.5]" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        No custom measurements on record
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Measurements recorded for blouses, kurtis, gowns, and
                        lehengas will be saved here for automated reuse across orders.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3 w-full">
                  {measurements.map((m) => (
                    <Card key={m.id} className="border border-border bg-card shadow-2xs">
                      <CardContent className="p-3.5">
                        <div className="font-semibold text-sm">
                          {m.dressTypeName || "Garment Pattern"}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* TAB: Payments */}
            <TabsContent
              value="payments"
              className="flex-1 min-h-0 m-0 p-4 sm:p-5 flex flex-col overflow-y-auto data-[state=inactive]:hidden"
            >
              {isPaymentsLoading ? (
                <div className="flex-1 flex items-center justify-center p-8 text-center text-xs text-muted-foreground">
                  <Loader2 className="size-5 animate-spin mr-2 text-primary" />
                  Loading transaction history...
                </div>
              ) : payments.length === 0 ? (
                <Card className="flex-1 w-full border border-dashed border-border/80 bg-muted/10 shadow-none flex flex-col items-center justify-center min-h-[300px]">
                  <CardContent className="p-8 text-center space-y-3 flex flex-col items-center justify-center max-w-sm mx-auto">
                    <div className="size-14 rounded-2xl bg-muted/50 border border-border/60 flex items-center justify-center shadow-2xs">
                      <CreditCard className="size-7 text-muted-foreground stroke-[1.5]" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        No transaction history found
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Advances, UPI receipts, and cash settlement receipts for this
                        client will appear here chronologically.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3 w-full">
                  {payments.map((p) => (
                    <Card
                      key={p.id}
                      className="border border-border bg-card shadow-2xs"
                    >
                      <CardContent className="p-3 flex items-center justify-between">
                        <div>
                          <div className="font-mono font-semibold text-sm text-foreground">
                            ₹{p.amount.toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {p.paymentMethod} •{" "}
                            {new Date(p.paymentDate).toLocaleDateString()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
