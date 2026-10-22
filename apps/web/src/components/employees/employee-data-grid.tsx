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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DepartmentComboboxFilter } from "./department-combobox-filter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useEmployees } from "@/services/employee-service";
import { DEPARTMENTS } from "@/lib/validations/employee";
import { DesignationBadge, getDesignationMeta } from "@/lib/designation-config";
import type { EmployeeResponse } from "@/types/employee";
import {
  Search,
  PlusIcon,
  RefreshCw,
  MoreHorizontal,
  Pencil,
  FileText,
  Trash2,
  X,
  Users,
  Calendar,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

interface EmployeeDataGridProps {
  onAddEmployee: () => void;
  onEditEmployee: (employee: EmployeeResponse) => void;
  onViewDocuments: (employee: EmployeeResponse) => void;
  onDeleteEmployee: (employee: EmployeeResponse) => void;
}

// Deterministic pastel avatar background & text colors matching reference
const avatarColorPalettes = [
  "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
  "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300",
  "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
];

function getAvatarColorClass(id: number, name: string) {
  let hash = id || 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
  }
  return avatarColorPalettes[Math.abs(hash) % avatarColorPalettes.length];
}

function EmployeeDataGridComponent({
  onAddEmployee,
  onEditEmployee,
  onViewDocuments,
  onDeleteEmployee,
}: EmployeeDataGridProps) {
  // ─── Filter & Search States ─────────────────────────────
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([
    { id: "employeeName", desc: false },
  ]);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Paginated query hook for the active table
  const { data, isLoading, isFetching, refetch } = useEmployees({
    search: debouncedSearch || undefined,
    department:
      selectedDepartments.length > 0
        ? selectedDepartments.join(",")
        : undefined,
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
  });

  // Query hook to calculate cumulative studio KPI statistics
  const { data: statsData, isLoading: statsLoading } = useEmployees({
    page: 1,
    pageSize: 100,
  });

  // Optimized cumulative summary metrics via useMemo
  const allEmployees = statsData?.items ?? data?.items ?? [];
  const totalEmployeesCount = statsData?.totalCount ?? data?.totalCount ?? 0;

  const { primaryDeptName, primaryDeptCount, PrimaryDeptIcon, totalAuditDocsCount, recentlyJoinedCount } =
    useMemo(() => {
      const map: Record<string, number> = {};
      let docsCount = 0;
      const now = new Date();
      const ninetyDaysAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      let recentCount = 0;

      for (const emp of allEmployees) {
        const dept = emp.department || "General";
        map[dept] = (map[dept] || 0) + 1;
        docsCount += emp.documents?.length || 0;

        const joinDate = new Date(emp.dateOfJoining);
        if (!isNaN(joinDate.getTime()) && joinDate >= ninetyDaysAgo) {
          recentCount++;
        }
      }

      const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
      const rawDept = sorted[0]?.[0];
      const meta = getDesignationMeta(rawDept);

      return {
        primaryDeptName: rawDept ? `${rawDept} Department` : "Studio Department",
        primaryDeptCount: sorted[0] ? sorted[0][1] : totalEmployeesCount,
        PrimaryDeptIcon: meta.icon,
        totalAuditDocsCount: docsCount,
        recentlyJoinedCount: recentCount,
      };
    }, [allEmployees, totalEmployeesCount]);

  // ─── Column Definitions (@reui/c-data-grid-5 architecture) ───
  const columns = useMemo<ColumnDef<DataGridFeatures, EmployeeResponse>[]>(
    () => [
      {
        accessorKey: "firstName",
        id: "employeeName",
        header: ({ column }) => (
          <DataGridColumnHeader
            column={column}
            title="Employee Name"
            className="text-xs font-semibold text-foreground/80"
          />
        ),
        cell: ({ row }) => {
          const emp = row.original;
          const initials = `${emp.firstName[0] || ""}${
            emp.lastName?.[0] || ""
          }`.toUpperCase();
          const fullName = `${emp.firstName} ${emp.lastName || ""}`.trim();
          const colorClass = getAvatarColorClass(emp.id, fullName);
          return (
            <div className="flex items-center gap-2.5 py-0.5">
              <Avatar className="size-7">
                <AvatarImage src="" alt={fullName} />
                <AvatarFallback className={`font-bold text-[10px] ${colorClass}`}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => onEditEmployee(emp)}
                  className="text-xs font-semibold text-foreground hover:text-primary transition-colors truncate leading-tight block text-left cursor-pointer"
                >
                  {fullName}
                </button>
                <p className="text-[10px] text-muted-foreground truncate font-normal leading-tight mt-0.5">
                  {emp.email}
                </p>
              </div>
            </div>
          );
        },
        meta: {
          skeleton: (
            <div className="flex items-center gap-2 py-0.5">
              <Skeleton className="size-7 rounded-full shrink-0" />
              <div className="space-y-1 min-w-0 flex-1">
                <Skeleton className="h-3 w-20 rounded-md" />
                <Skeleton className="h-2 w-28 rounded-md" />
              </div>
            </div>
          ),
        },
        size: 220,
        enableSorting: true,
      },
      {
        accessorKey: "department",
        id: "department",
        header: ({ column }) => (
          <DataGridColumnHeader
            column={column}
            title="Department"
            className="text-xs font-semibold text-foreground/80"
          />
        ),
        cell: (info) => (
          <DesignationBadge name={info.getValue() as string} />
        ),
        meta: {
          skeleton: <Skeleton className="h-4.5 w-16 rounded-md" />,
        },
        size: 130,
        enableSorting: true,
      },
      {
        accessorKey: "mobile",
        id: "mobile",
        header: ({ column }) => (
          <DataGridColumnHeader
            column={column}
            title="Contact"
            className="text-xs font-semibold text-foreground/80"
          />
        ),
        cell: (info) => {
          const raw = (info.getValue() as string) || "";
          const formatted =
            raw.length === 10 ? `${raw.slice(0, 5)} ${raw.slice(5)}` : raw;
          return (
            <span className="font-mono text-xs text-foreground/90">
              {formatted}
            </span>
          );
        },
        meta: {
          skeleton: <Skeleton className="h-3.5 w-20 rounded-md" />,
        },
        size: 120,
        enableSorting: false,
      },
      {
        accessorKey: "dateOfJoining",
        id: "dateOfJoining",
        header: ({ column }) => (
          <DataGridColumnHeader
            column={column}
            title="Joining Date"
            className="text-xs font-semibold text-foreground/80"
          />
        ),
        cell: (info) => {
          const val = info.getValue() as string;
          const d = new Date(val);
          return (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {isNaN(d.getTime())
                ? val
                : d.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
            </span>
          );
        },
        meta: {
          skeleton: <Skeleton className="h-3.5 w-16 rounded-md" />,
        },
        size: 110,
        enableSorting: true,
      },
      {
        id: "documents",
        header: ({ column }) => (
          <DataGridColumnHeader
            column={column}
            title="Audit Docs"
            className="text-xs font-semibold text-foreground/80"
          />
        ),
        cell: ({ row }) => {
          const emp = row.original;
          const count = emp.documents?.length ?? 0;
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDocuments(emp);
                  }}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/50 border border-rose-200/60 dark:border-rose-900/40 cursor-pointer transition-colors"
                >
                  <FileText className="size-2.5 text-rose-500" />
                  <span>
                    {count} {count === 1 ? "Doc" : "Docs"}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">Manage uploaded documents</p>
              </TooltipContent>
            </Tooltip>
          );
        },
        meta: {
          skeleton: <Skeleton className="h-5 w-12 rounded-md" />,
        },
        size: 95,
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
          const emp = row.original;
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="size-6 text-muted-foreground hover:text-foreground cursor-pointer rounded-md hover:bg-muted/60"
                        aria-label="Open employee actions menu"
                      >
                        <MoreHorizontal className="size-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p className="text-xs">Actions</p>
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent
                  align="end"
                  className="w-40 rounded-xl shadow-lg border border-border/60 bg-popover/95 backdrop-blur-md"
                >
                  <DropdownMenuItem
                    onClick={() => onEditEmployee(emp)}
                    className="text-xs gap-2 py-1.5 cursor-pointer"
                  >
                    <Pencil className="size-3.5 text-muted-foreground" />
                    <span>Edit Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onViewDocuments(emp)}
                    className="text-xs gap-2 py-1.5 cursor-pointer"
                  >
                    <FileText className="size-3.5 text-muted-foreground" />
                    <span>Documents</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDeleteEmployee(emp)}
                    className="text-xs gap-2 py-1.5 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                  >
                    <Trash2 className="size-3.5" />
                    <span>Deactivate</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
        meta: {
          skeleton: <Skeleton className="size-6 rounded-md ml-auto" />,
        },
        size: 60,
      },
    ],
    [onEditEmployee, onViewDocuments, onDeleteEmployee]
  );

  // TanStack table instance (@reui/c-data-grid-5 configuration)
  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: data?.items ?? [],
    pageCount: data?.totalPages ?? 1,
    rowCount: data?.totalCount ?? 0,
    getRowId: (row: EmployeeResponse) => String(row.id),
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
      {/* ─── 4 Responsive KPI Summary Cards (Compact, Colorful Executive UI) ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5 shrink-0">
        {/* Card 1: Total Employees (Rose/Crimson Theme) */}
        <div className="group relative overflow-hidden rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-gradient-to-br from-rose-50/90 via-rose-50/40 to-pink-100/60 dark:from-rose-950/40 dark:via-rose-950/20 dark:to-pink-900/30 p-2.5 sm:px-3 shadow-2xs hover:shadow-xs hover:border-rose-400/80 hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 truncate">
              Total Employees
            </span>
            <div className="flex size-6 items-center justify-center rounded-md bg-rose-500 text-white shadow-2xs shrink-0">
              <Users className="size-3" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-1.5">
            <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-rose-950 dark:text-rose-50 leading-none">
              {statsLoading ? (
                <Skeleton className="h-6 w-10 rounded-md bg-rose-200/50" />
              ) : (
                totalEmployeesCount
              )}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium bg-rose-100/90 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200 border border-rose-200/80 dark:border-rose-800">
              <CheckCircle2 className="size-2.5" />
              <span>Active</span>
            </span>
          </div>
          <p className="mt-0.5 text-[10px] font-medium text-rose-600/80 dark:text-rose-300/80 truncate leading-tight">
            Registered Atelier Staff
          </p>
          <Users className="absolute -bottom-2 -right-2 size-12 text-rose-500/10 pointer-events-none group-hover:text-rose-500/15 transition-colors" />
        </div>

        {/* Card 2: Primary Studio Department (Blue Theme) */}
        <div className="group relative overflow-hidden rounded-xl border border-blue-200/80 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/90 via-blue-50/40 to-indigo-100/60 dark:from-blue-950/40 dark:via-blue-950/20 dark:to-indigo-900/30 p-2.5 sm:px-3 shadow-2xs hover:shadow-xs hover:border-blue-400/80 hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 truncate">
              Top Department
            </span>
            <div className="flex size-6 items-center justify-center rounded-md bg-blue-500 text-white shadow-2xs shrink-0">
              <PrimaryDeptIcon className="size-3" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-1.5">
            <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-blue-950 dark:text-blue-50 leading-none">
              {statsLoading ? (
                <Skeleton className="h-6 w-10 rounded-md bg-blue-200/50" />
              ) : (
                primaryDeptCount
              )}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium bg-blue-100/90 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 border border-blue-200/80 dark:border-blue-800 truncate max-w-[100px]">
              {primaryDeptName.replace(" Department", "")}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] font-medium text-blue-600/80 dark:text-blue-300/80 truncate leading-tight">
            {totalEmployeesCount > 0
              ? `${Math.round((primaryDeptCount / totalEmployeesCount) * 100)}% of studio team`
              : "Leading department"}
          </p>
          <PrimaryDeptIcon className="absolute -bottom-2 -right-2 size-12 text-blue-500/10 pointer-events-none group-hover:text-blue-500/15 transition-colors" />
        </div>

        {/* Card 3: Audit Docs (Emerald Theme) */}
        <div className="group relative overflow-hidden rounded-xl border border-emerald-200/80 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/90 via-emerald-50/40 to-teal-100/60 dark:from-emerald-950/40 dark:via-emerald-950/20 dark:to-teal-900/30 p-2.5 sm:px-3 shadow-2xs hover:shadow-xs hover:border-emerald-400/80 hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 truncate">
              Audit Docs
            </span>
            <div className="flex size-6 items-center justify-center rounded-md bg-emerald-500 text-white shadow-2xs shrink-0">
              <FileText className="size-3" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-1.5">
            <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-emerald-950 dark:text-emerald-50 leading-none">
              {statsLoading ? (
                <Skeleton className="h-6 w-10 rounded-md bg-emerald-200/50" />
              ) : (
                totalAuditDocsCount
              )}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium bg-emerald-100/90 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 border border-emerald-200/80 dark:border-emerald-800">
              <ShieldCheck className="size-2.5" />
              <span>Verified</span>
            </span>
          </div>
          <p className="mt-0.5 text-[10px] font-medium text-emerald-600/80 dark:text-emerald-300/80 truncate leading-tight">
            PAN & Aadhaar files
          </p>
          <FileText className="absolute -bottom-2 -right-2 size-12 text-emerald-500/10 pointer-events-none group-hover:text-emerald-500/15 transition-colors" />
        </div>

        {/* Card 4: Recently Joined (Amber Theme) */}
        <div className="group relative overflow-hidden rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/90 via-amber-50/40 to-orange-100/60 dark:from-amber-950/40 dark:via-amber-950/20 dark:to-orange-900/30 p-2.5 sm:px-3 shadow-2xs hover:shadow-xs hover:border-amber-400/80 hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 truncate">
              Recently Joined
            </span>
            <div className="flex size-6 items-center justify-center rounded-md bg-amber-500 text-white shadow-2xs shrink-0">
              <Calendar className="size-3" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-1.5">
            <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-amber-950 dark:text-amber-50 leading-none">
              {statsLoading ? (
                <Skeleton className="h-6 w-10 rounded-md bg-amber-200/50" />
              ) : (
                recentlyJoinedCount
              )}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium bg-amber-100/90 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 border border-amber-200/80 dark:border-amber-800">
              <Sparkles className="size-2.5" />
              <span>New Talent</span>
            </span>
          </div>
          <p className="mt-0.5 text-[10px] font-medium text-amber-600/80 dark:text-amber-300/80 truncate leading-tight">
            Joined in past 180 days
          </p>
          <Calendar className="absolute -bottom-2 -right-2 size-12 text-amber-500/10 pointer-events-none group-hover:text-amber-500/15 transition-colors" />
        </div>
      </div>

      {/* ─── 3. Enclosed Card: Toolbar + DataGrid Table + Pagination ─── */}
      <div className="w-full flex-1 min-h-0 rounded-xl border border-border/70 bg-card p-3 sm:p-3.5 shadow-2xs flex flex-col gap-2.5">
        {/* Toolbar Header */}
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 sm:gap-2.5">
          {/* Left: Search Input + Role/Designation Filter Combobox */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-48 sm:w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search name, email, mobile..."
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

            <DepartmentComboboxFilter
              departments={DEPARTMENTS}
              selectedDepartments={selectedDepartments}
              className="w-44 sm:w-52"
              onSelectedChange={(depts) => {
                setSelectedDepartments(depts);
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
            />
          </div>

          {/* Right: Refresh Button + Register Employee Button */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
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
              onClick={onAddEmployee}
              className="h-8 px-3 gap-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-xs shadow-xs cursor-pointer active:scale-95 transition-transform"
            >
              <PlusIcon aria-hidden="true" className="size-3.5" />
              <span>Register Employee</span>
            </Button>
          </div>
        </div>

        {/* DataGrid Table with @reui/c-data-grid-5 striped & rowRounded configuration */}
        <DataGrid
          table={table}
          recordCount={data?.totalCount ?? 0}
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
          emptyMessage="No employees found matching your criteria."
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

export const EmployeeDataGrid = memo(EmployeeDataGridComponent);
