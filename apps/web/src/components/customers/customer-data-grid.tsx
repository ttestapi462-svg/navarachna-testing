"use client";

import { useState, useMemo, useEffect, memo } from "react";
import {
  ColumnDef,
  PaginationState,
  SortingState,
  useTable,
} from "@tanstack/react-table";
import {
  DataGrid,
  DataGridContainer,
  dataGridFeatures,
  type DataGridFeatures,
} from "@/components/reui/data-grid/data-grid";
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table";
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination";
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header";
import { DataGridScrollArea } from "@/components/reui/data-grid/data-grid-scroll-area";
import { Badge } from "@/components/reui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useCustomers } from "@/services/customer-service";
import type { Customer } from "@/types/customer";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import {
  CustomerStatusFilter,
  type CustomerStatusFilterValue,
} from "./customer-status-filter";
import { WhatsAppIcon } from "@/components/brand/whatsapp-icon";
import {
  Search,
  PlusIcon,
  RefreshCw,
  Pencil,
  Trash2,
  X,
  Users,
  UserCheck,
  CheckCircle2,
  Sparkles,
  Phone,
  MapPin,
  Eye,
  Calendar,
} from "lucide-react";

interface CustomerDataGridProps {
  onAddCustomer: () => void;
  onEditCustomer: (customer: Customer) => void;
  onViewProfile: (customer: Customer) => void;
  onDeleteCustomer: (customer: Customer) => void;
}

function CustomerDataGridComponent({
  onAddCustomer,
  onEditCustomer,
  onViewProfile,
  onDeleteCustomer,
}: CustomerDataGridProps) {
  // ─── Filter & Search States ─────────────────────────────
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<CustomerStatusFilterValue>("ALL");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([
    { id: "customerName", desc: false },
  ]);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const activeParam =
    statusFilter === "ACTIVE"
      ? true
      : statusFilter === "INACTIVE"
      ? false
      : undefined;

  // Active paginated customer query
  const { data, isLoading, isFetching, isError, error, refetch } = useCustomers({
    search: debouncedSearch || undefined,
    isActive: activeParam,
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
  });

  // Query hook to calculate studio KPI metrics
  const { data: statsData, isLoading: statsLoading } = useCustomers({
    page: 1,
    pageSize: 100,
  });

  useEffect(() => {
    if (isError && error) {
      toast.error("Failed to load customer directory", {
        description:
          error instanceof Error ? error.message : "Unable to reach server.",
      });
    }
  }, [isError, error]);

  const handleRefresh = async () => {
    try {
      const res = await refetch();
      if (res.isSuccess) {
        toast.success("Customer directory refreshed", {
          description: "Latest client records synchronized.",
        });
      } else if (res.isError) {
        toast.error("Failed to refresh directory", {
          description:
            res.error instanceof Error ? res.error.message : "Network error.",
        });
      }
    } catch (err: unknown) {
      toast.error("Failed to refresh directory", {
        description: err instanceof Error ? err.message : "Network error.",
      });
    }
  };


  const customersList = data?.data ?? [];
  const totalCustomers = data?.totalCount ?? 0;

  // Optimized KPI metrics via useMemo
  const allCustomers = statsData?.data ?? customersList;
  const totalClientsCount = statsData?.totalCount ?? totalCustomers;

  const {
    activeCount,
    activePercentage,
    whatsappPercentage,
    newThisMonthCount,
    currentMonthLabel,
  } = useMemo(() => {
    let active = 0;
    let whatsapp = 0;
    let newThisMonth = 0;

    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthLabel = now.toLocaleString("en-IN", { month: "short", year: "numeric" });

    for (const c of allCustomers) {
      if (c.isActive) {
        active++;
      }

      if (c.whatsappNumber || c.mobileNumber) {
        whatsapp++;
      }

      if (c.createdAt) {
        const createdDate = new Date(c.createdAt);
        if (
          !isNaN(createdDate.getTime()) &&
          createdDate >= startOfCurrentMonth
        ) {
          newThisMonth++;
        }
      }
    }

    const percent =
      totalClientsCount > 0
        ? Math.round((active / totalClientsCount) * 100)
        : 100;

    const whatsappPct =
      totalClientsCount > 0
        ? Math.round((whatsapp / totalClientsCount) * 100)
        : 100;

    return {
      activeCount: active,
      activePercentage: percent,
      whatsappPercentage: whatsappPct,
      newThisMonthCount: newThisMonth,
      currentMonthLabel: monthLabel,
    };
  }, [allCustomers, totalClientsCount]);

  // ─── Column Definitions (@reui/c-data-grid-5 architecture) ───
  const columns = useMemo<ColumnDef<DataGridFeatures, Customer>[]>(
    () => [
      {
        accessorKey: "name",
        id: "customerName",
        header: ({ column }) => (
          <DataGridColumnHeader
            column={column}
            title="Customer Name"
            className="text-xs font-semibold text-foreground/80"
          />
        ),
        cell: ({ row }) => {
          const cust = row.original;

          return (
            <div className="py-0.5 min-w-0">
              <button
                type="button"
                onClick={() => onViewProfile(cust)}
                className="text-xs font-semibold text-foreground hover:text-primary transition-colors truncate leading-tight block text-left cursor-pointer"
              >
                {cust.name}
              </button>
            </div>
          );
        },
        meta: {
          skeleton: (
            <div className="py-0.5 min-w-0 flex-1">
              <Skeleton className="h-3.5 w-28 rounded-md" />
            </div>
          ),
        },
        size: 190,
        enableSorting: true,
      },
      {
        accessorKey: "mobileNumber",
        id: "mobileNumber",
        header: ({ column }) => (
          <DataGridColumnHeader
            column={column}
            title="Contact"
            className="text-xs font-semibold text-foreground/80"
          />
        ),
        cell: ({ row }) => {
          const raw = row.original.mobileNumber || "";
          const formatted =
            raw.length === 10 ? `${raw.slice(0, 5)} ${raw.slice(5)}` : raw;
          return (
            <a
              href={`tel:${raw}`}
              className="inline-flex items-center gap-1.5 font-mono text-xs text-foreground/90 hover:text-primary hover:underline"
            >
              <Phone className="size-3 text-muted-foreground shrink-0" />
              <span>{formatted}</span>
            </a>
          );
        },
        meta: {
          skeleton: <Skeleton className="h-3.5 w-20 rounded-md" />,
        },
        size: 130,
        enableSorting: false,
      },
      {
        id: "location",
        header: ({ column }) => (
          <DataGridColumnHeader
            column={column}
            title="Location"
            className="text-xs font-semibold text-foreground/80"
          />
        ),
        cell: ({ row }) => {
          const cust = row.original;
          const loc = [cust.area, cust.city].filter(Boolean).join(", ");
          return loc ? (
            <span className="text-xs text-foreground/90 flex items-center gap-1.5 truncate">
              <MapPin className="size-3 text-muted-foreground shrink-0" />
              <span className="truncate">{loc}</span>
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          );
        },
        meta: {
          skeleton: <Skeleton className="h-3.5 w-20 rounded-md" />,
        },
        size: 150,
        enableSorting: false,
      },
      {
        accessorKey: "isActive",
        id: "isActive",
        header: ({ column }) => (
          <DataGridColumnHeader
            column={column}
            title="Status"
            className="text-xs font-semibold text-foreground/80"
          />
        ),
        cell: ({ row }) => {
          const active = row.original.isActive;
          return (
            <Badge
              variant={active ? "success-light" : "outline"}
              size="sm"
              radius="full"
              className={`font-semibold text-[10.5px] gap-1.5 px-2 py-0.5 ${
                active
                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-400"
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${
                  active
                    ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]"
                    : "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.4)]"
                }`}
              />
              <span>{active ? "Active" : "Inactive"}</span>
            </Badge>
          );
        },
        meta: {
          skeleton: <Skeleton className="h-4.5 w-16 rounded-full" />,
        },
        size: 100,
        enableSorting: false,
      },
      {
        accessorKey: "updatedAt",
        id: "updatedAt",
        header: ({ column }) => (
          <DataGridColumnHeader
            column={column}
            title="Updated At"
            className="text-xs font-semibold text-foreground/80"
          />
        ),
        cell: ({ row }) => {
          const cust = row.original;
          const raw = cust.updatedAt ?? cust.createdAt;
          const d = new Date(raw);
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-muted-foreground whitespace-nowrap cursor-default">
                  {isNaN(d.getTime())
                    ? "—"
                    : d.toLocaleString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">
                  {cust.updatedAt
                    ? "Last updated timestamp"
                    : "No updates yet — showing created timestamp"}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        },
        meta: {
          skeleton: <Skeleton className="h-3.5 w-24 rounded-md" />,
        },
        size: 140,
        enableSorting: false,
      },
      {
        accessorKey: "updatedBy",
        id: "updatedBy",
        header: ({ column }) => (
          <DataGridColumnHeader
            column={column}
            title="Updated By"
            className="text-xs font-semibold text-foreground/80"
          />
        ),
        cell: ({ row }) => {
          const cust = row.original;
          const actor = cust.updatedBy ?? cust.createdBy;
          const actorName = cust.updatedByUsername ?? cust.createdByUsername;
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-foreground/90 cursor-default block max-w-[120px] truncate">
                  {actorName ?? (actor != null ? `#${actor}` : "—")}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">
                  {cust.updatedBy != null
                    ? `Last updated by ${actorName ?? `#${cust.updatedBy}`}`
                    : "No updates yet — showing created by"}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        },
        meta: {
          skeleton: <Skeleton className="h-3.5 w-16 rounded-md" />,
        },
        size: 110,
        enableSorting: false,
      },
      {
        id: "actions",
        header: ({ column }) => (
          <DataGridColumnHeader
            column={column}
            title="Actions"
            className="text-xs font-semibold text-foreground/80 justify-end"
          />
        ),
        cell: ({ row }) => {
          const cust = row.original;
          return (
            <div className="flex items-center justify-end gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onEditCustomer(cust)}
                    className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors"
                    aria-label="Edit customer"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">Edit customer</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onViewProfile(cust)}
                    className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors"
                    aria-label="View profile"
                  >
                    <Eye className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">View profile</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onDeleteCustomer(cust)}
                    className="size-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer transition-colors"
                    aria-label="Delete customer"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">Delete customer</p>
                </TooltipContent>
              </Tooltip>
            </div>
          );
        },
        meta: {
          skeleton: <Skeleton className="h-6 w-24 rounded-md ml-auto" />,
        },
        size: 110,
      },
    ],
    [onViewProfile, onEditCustomer, onDeleteCustomer]
  );

  // TanStack table instance (@reui/c-data-grid-5 configuration)
  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: customersList,
    pageCount: data?.totalPages ?? 1,
    rowCount: totalCustomers,
    getRowId: (row: Customer) => String(row.id),
    state: {
      pagination,
      sorting,
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    manualPagination: true,
  });

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 h-full gap-2.5 sm:gap-3 pb-1">
      {/* ─── Impressive Atelier KPI Deck (Executive Intelligence & Studio Analytics) ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 shrink-0">
        {/* Card 1: Total Client Portfolio (Atelier Maroon Theme) */}
        <div className="group relative flex items-center gap-3 rounded-xl border border-border/75 bg-card/90 hover:bg-card hover:border-primary/40 hover:shadow-xs p-2.5 sm:px-3 sm:py-2.5 text-left transition-all duration-200 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary transition-all duration-200 group-hover:bg-primary/15 group-hover:border-primary/30">
            <Users className="size-4.5 stroke-[1.8]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                Total Clients
              </span>
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-medium bg-primary/10 text-primary border border-primary/20 shrink-0">
                Directory
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-bold tracking-tight text-foreground leading-none">
                {statsLoading ? (
                  <Skeleton className="h-5 w-7 rounded-md bg-primary/20" />
                ) : (
                  totalClientsCount
                )}
              </span>
              <span className="text-[11px] text-muted-foreground/80 font-normal truncate leading-none">
                registered patrons
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Active Engagement Rate (Emerald Theme) */}
        <div className="group relative flex items-center gap-3 rounded-xl border border-border/75 bg-card/90 hover:bg-card hover:border-emerald-300/60 hover:shadow-xs p-2.5 sm:px-3 sm:py-2.5 text-left transition-all duration-200 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 transition-all duration-200 group-hover:bg-emerald-500/15 group-hover:border-emerald-500/30">
            <UserCheck className="size-4.5 stroke-[1.8]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                Active Engagement
              </span>
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 shrink-0">
                {activeCount} Active
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-bold tracking-tight text-foreground leading-none">
                {statsLoading ? (
                  <Skeleton className="h-5 w-7 rounded-md bg-emerald-200/50" />
                ) : (
                  `${activePercentage}%`
                )}
              </span>
              <span className="text-[11px] text-muted-foreground/80 font-normal truncate leading-none">
                order ready rate
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Direct WhatsApp Reach (WhatsApp Green Theme) */}
        <div className="group relative flex items-center gap-3 rounded-xl border border-border/75 bg-card/90 hover:bg-card hover:border-emerald-400/60 hover:shadow-xs p-2.5 sm:px-3 sm:py-2.5 text-left transition-all duration-200 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-emerald-600/20 bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 transition-all duration-200 group-hover:bg-emerald-600/15 group-hover:border-emerald-600/30">
            <WhatsAppIcon className="size-4.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                WhatsApp Reach
              </span>
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-medium bg-emerald-600/10 text-emerald-700 dark:text-emerald-300 border border-emerald-600/20 shrink-0">
                Direct
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-bold tracking-tight text-foreground leading-none">
                {statsLoading ? (
                  <Skeleton className="h-5 w-7 rounded-md bg-emerald-200/50" />
                ) : (
                  `${whatsappPercentage}%`
                )}
              </span>
              <span className="text-[11px] text-muted-foreground/80 font-normal truncate leading-none">
                instant fitting alerts
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: New This Month (Royal Blue Theme) */}
        <div className="group relative flex items-center gap-3 rounded-xl border border-border/75 bg-card/90 hover:bg-card hover:border-blue-300/60 hover:shadow-xs p-2.5 sm:px-3 sm:py-2.5 text-left transition-all duration-200 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400 transition-all duration-200 group-hover:bg-blue-500/15 group-hover:border-blue-500/30">
            <Sparkles className="size-4.5 stroke-[1.8]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                New This Month
              </span>
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-medium bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 shrink-0">
                {currentMonthLabel}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-bold tracking-tight text-foreground leading-none">
                {statsLoading ? (
                  <Skeleton className="h-5 w-7 rounded-md bg-blue-200/50" />
                ) : (
                  newThisMonthCount
                )}
              </span>
              <span className="text-[11px] text-muted-foreground/80 font-normal truncate leading-none">
                new registrations
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. Enclosed Card: Toolbar + DataGrid Table + Pagination (@reui/c-data-grid-5) ─── */}
      <div className="w-full flex-1 min-h-0 rounded-xl border border-border/70 bg-card p-3 sm:p-3.5 shadow-2xs flex flex-col gap-2.5">
        {/* Toolbar Header */}
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 sm:gap-2.5">
          {/* Left: Search Input + Status Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-48 sm:w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search name, mobile, city..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-8 pr-7 h-8 text-xs rounded-lg border-border/70 bg-background"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>

            <CustomerStatusFilter
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val);
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
            />
          </div>

          {/* Right: Refresh Button + Register Customer Button */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isFetching}
                  className="h-8 px-2.5 gap-1.5 rounded-lg text-xs font-medium border-border/70 hover:bg-muted/60 cursor-pointer"
                >
                  <RefreshCw
                    className={`size-3.5 ${
                      isFetching ? "animate-spin text-primary" : ""
                    }`}
                  />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Refresh data</p>
              </TooltipContent>
            </Tooltip>

            <Button
              onClick={onAddCustomer}
              className="h-8 px-3 gap-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-xs shadow-xs cursor-pointer active:scale-95 transition-transform"
            >
              <PlusIcon aria-hidden="true" className="size-3.5" />
              <span>Register Customer</span>
            </Button>
          </div>
        </div>

        {/* DataGrid Table with @reui/c-data-grid-5 striped & rowRounded configuration */}
        <DataGrid
          table={table}
          recordCount={totalCustomers}
          isLoading={isLoading}
          loadingMode="skeleton"
          tableLayout={{
            stripped: true,
            rowRounded: true,
          }}
          tableClassNames={{
            base: "w-full min-w-full",
            headerSticky: "sticky top-0 z-20 bg-muted/60 backdrop-blur-xs",
          }}
          emptyMessage="No customers found matching your criteria."
        >
          <div className="w-full flex-1 min-h-0 flex flex-col justify-between">
            <DataGridContainer className="w-full flex-1 min-h-0 overflow-hidden flex flex-col">
              <DataGridScrollArea className="w-full flex-1 min-h-0">
                <DataGridTable />
              </DataGridScrollArea>
            </DataGridContainer>
            <div className="shrink-0 pt-2 border-t border-border/50 mt-auto">
              <DataGridPagination sizes={[10, 20, 50, 100]} />
            </div>
          </div>
        </DataGrid>
      </div>
    </div>
  );
}

export const CustomerDataGrid = memo(CustomerDataGridComponent);
