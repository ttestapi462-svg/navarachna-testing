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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useEmployees } from "@/services/employee-service";
import { DEPARTMENTS } from "@/lib/validations/employee";
import { DesignationBadge } from "@/lib/designation-config";
import type { EmployeeResponse } from "@/types/employee";
import { toast } from "@/components/ui/sonner";
import {
  Search,
  PlusIcon,
  RefreshCw,
  Pencil,
  FileText,
  Trash2,
  X,
  Users,
  Building2,
  UserRoundPlus,
  ShieldOff,
} from "lucide-react";

interface EmployeeDataGridProps {
  onAddEmployee: () => void;
  onEditEmployee: (employee: EmployeeResponse) => void;
  onViewDocuments: (employee: EmployeeResponse) => void;
  onDeleteEmployee: (employee: EmployeeResponse) => void;
  onRemoveLogin: (employee: EmployeeResponse) => void;
}

// Deterministic pastel avatar background & text colors matching reference
const avatarColorPalettes = [
  "bg-primary/15 text-primary dark:bg-primary/30 dark:text-primary-foreground",
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
  onRemoveLogin,
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
  const { data, isLoading, isFetching, isError, error, refetch } = useEmployees({
    search: debouncedSearch || undefined,
    department:
      selectedDepartments.length > 0
        ? selectedDepartments.join(",")
        : undefined,
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
  });

  useEffect(() => {
    if (isError && error) {
      toast.error("Failed to load employee directory", {
        description: error instanceof Error ? error.message : "Unable to reach server.",
      });
    }
  }, [isError, error]);

  const handleRefresh = async () => {
    try {
      const res = await refetch();
      if (res.isSuccess) {
        toast.success("Employee directory refreshed", {
          description: "Latest records and studio statistics synchronized.",
        });
      } else if (res.isError) {
        toast.error("Failed to refresh directory", {
          description: res.error instanceof Error ? res.error.message : "Network error.",
        });
      }
    } catch (err: unknown) {
      toast.error("Failed to refresh directory", {
        description: err instanceof Error ? err.message : "Network error.",
      });
    }
  };

  // Query hook to calculate cumulative studio KPI statistics
  const { data: statsData, isLoading: statsBaseLoading } = useEmployees({
    page: 1,
    pageSize: 100,
  });

  const { data: statsPageTwo, isLoading: statsPageTwoLoading } = useEmployees({
    page: 2,
    pageSize: 100,
  });

  // Optimized cumulative summary metrics via useMemo
  const allEmployees = useMemo(() => {
    if (!statsData) return data?.items ?? [];
    return [
      ...statsData.items,
      ...(statsData.totalCount > statsData.items.length ? statsPageTwo?.items ?? [] : []),
    ];
  }, [statsData, statsPageTwo?.items, data?.items]);
  const totalEmployeesCount = statsData?.totalCount ?? data?.totalCount ?? 0;
  const statsLoading = statsBaseLoading || (totalEmployeesCount > 100 && statsPageTwoLoading);

  const { smallestDepartment, employeesAddedThisMonthCount } = useMemo(() => {
    let employeesAddedThisMonth = 0;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const departmentCounts = new Map<string, number>();

    for (const emp of allEmployees) {
      const createdAt = new Date(emp.createdAt);
      if (!Number.isNaN(createdAt.getTime()) && createdAt >= monthStart && createdAt < nextMonthStart) {
        employeesAddedThisMonth++;
      }

      const department = emp.department?.trim();
      if (emp.isActive && department) {
        departmentCounts.set(department, (departmentCounts.get(department) ?? 0) + 1);
      }
    }

    const smallestHeadcount = Math.min(...departmentCounts.values());
    const smallestDepartmentNames = [...departmentCounts.entries()]
      .filter(([, count]) => count === smallestHeadcount)
      .map(([name]) => name)
      .sort((a, b) => a.localeCompare(b));

    return {
      smallestDepartment: smallestDepartmentNames.length > 0
        ? { names: smallestDepartmentNames, count: smallestHeadcount }
        : null,
      employeesAddedThisMonthCount: employeesAddedThisMonth,
    };
  }, [allEmployees]);

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
          const emp = row.original;
          const raw = emp.updatedAt ?? emp.createdAt;
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
                  {emp.updatedAt
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
        size: 150,
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
          const emp = row.original;
          const actor = emp.updatedBy ?? emp.createdBy;
          const actorName = emp.updatedByUsername ?? emp.createdByUsername;
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-foreground/90 cursor-default block max-w-[120px] truncate">
                  {actorName ?? (actor != null ? `#${actor}` : "—")}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">
                  {emp.updatedBy != null
                    ? `Last updated by ${actorName ?? `#${emp.updatedBy}`}`
                    : "No updates yet — showing created by"}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        },
        meta: {
          skeleton: <Skeleton className="h-3.5 w-10 rounded-md" />,
        },
        size: 95,
        enableSorting: false,
      },
      {
        id: "actions",
        header: ({ column }) => (
          <DataGridColumnHeader
            column={column}
            title="Actions"
            className="text-xs font-semibold text-foreground/80 justify-start"
          />
        ),
        cell: ({ row }) => {
          const emp = row.original;
          return (
            <div className="flex items-center justify-start gap-1">
              <Tooltip><TooltipTrigger asChild><button type="button" onClick={() => onEditEmployee(emp)} aria-label="Edit employee" className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"><Pencil className="size-4" /></button></TooltipTrigger><TooltipContent side="top"><p className="text-xs">Edit profile</p></TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><button type="button" onClick={() => onViewDocuments(emp)} aria-label="View employee documents" className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"><FileText className="size-4" /></button></TooltipTrigger><TooltipContent side="top"><p className="text-xs">Documents</p></TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><button type="button" onClick={() => onRemoveLogin(emp)} aria-label="Remove employee login" className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"><ShieldOff className="size-4" /></button></TooltipTrigger><TooltipContent side="top"><p className="text-xs">Remove login</p></TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><button type="button" onClick={() => onDeleteEmployee(emp)} aria-label="Deactivate employee" className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-4" /></button></TooltipTrigger><TooltipContent side="top"><p className="text-xs">Deactivate</p></TooltipContent></Tooltip>
            </div>
          );
        },
        meta: {
          skeleton: <Skeleton className="ml-auto h-7 w-28 rounded-md" />,
        },
        size: 125,
      },
    ],
    [onEditEmployee, onViewDocuments, onDeleteEmployee, onRemoveLogin]
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
        {/* Card 1: Total Employees */}
        <div className="group relative overflow-hidden rounded-xl border border-primary/25 dark:border-primary/40 bg-gradient-to-br from-primary/10 via-background to-accent/20 dark:from-primary/20 dark:via-background dark:to-accent/10 p-2.5 sm:px-3 shadow-2xs hover:shadow-xs hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary dark:text-primary-foreground truncate">
              Total Employees
            </span>
            <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-2xs shrink-0">
              <Users className="size-3" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-1.5">
            <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-primary dark:text-primary-foreground leading-none">
              {statsLoading ? (
                <Skeleton className="h-6 w-10 rounded-md bg-primary/20" />
              ) : (
                totalEmployeesCount
              )}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground border border-primary/20 dark:border-primary/40">
              <span>Headcount</span>
            </span>
          </div>
          <p className="mt-0.5 text-[10px] font-medium text-primary/80 dark:text-primary-foreground/80 truncate leading-tight">
            Employees in the directory
          </p>
          <Users className="absolute -bottom-2 -right-2 size-12 text-primary/10 pointer-events-none group-hover:text-primary/15 transition-colors" />
        </div>

        {/* Card 2: Total Departments */}
        <div className="group relative overflow-hidden rounded-xl border border-blue-200/80 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/90 via-blue-50/40 to-indigo-100/60 dark:from-blue-950/40 dark:via-blue-950/20 dark:to-indigo-900/30 p-2.5 sm:px-3 shadow-2xs hover:shadow-xs hover:border-blue-400/80 hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 truncate">
              Total Departments
            </span>
            <div className="flex size-6 items-center justify-center rounded-md bg-blue-500 text-white shadow-2xs shrink-0">
              <Building2 className="size-3" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-1.5">
            <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-blue-950 dark:text-blue-50 leading-none">
              {statsLoading ? (
                <Skeleton className="h-6 w-10 rounded-md bg-blue-200/50" />
              ) : (
                DEPARTMENTS.length
              )}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium bg-blue-100/90 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 border border-blue-200/80 dark:border-blue-800 truncate max-w-[100px]">
              Studio-wide
            </span>
          </div>
          <p className="mt-0.5 text-[10px] font-medium text-blue-600/80 dark:text-blue-300/80 truncate leading-tight">
            Departments available to the team
          </p>
          <Building2 className="absolute -bottom-2 -right-2 size-12 text-blue-500/10 pointer-events-none group-hover:text-blue-500/15 transition-colors" />
        </div>

        {/* Card 3: Smallest Department (Emerald Theme) */}
        <div className="group relative overflow-hidden rounded-xl border border-emerald-200/80 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/90 via-emerald-50/40 to-teal-100/60 dark:from-emerald-950/40 dark:via-emerald-950/20 dark:to-teal-900/30 p-2.5 sm:px-3 shadow-2xs hover:shadow-xs hover:border-emerald-400/80 hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 truncate">
              Smallest Department
            </span>
            <div className="flex size-6 items-center justify-center rounded-md bg-emerald-500 text-white shadow-2xs shrink-0">
              <Users className="size-3" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-1.5">
            <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-emerald-950 dark:text-emerald-50 leading-none">
              {statsLoading ? (
                <Skeleton className="h-6 w-10 rounded-md bg-emerald-200/50" />
              ) : (
                smallestDepartment?.count ?? "—"
              )}
            </span>
            <span
              title={smallestDepartment?.names.join(", ")}
              className="inline-flex max-w-[120px] items-center gap-1 truncate rounded-full px-1.5 py-0.5 text-[9px] font-medium bg-emerald-100/90 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 border border-emerald-200/80 dark:border-emerald-800"
            >
              {smallestDepartment
                ? smallestDepartment.names.length === 1
                  ? smallestDepartment.names[0]
                  : `${smallestDepartment.names.length} tied`
                : "No staffed teams"}
            </span>
          </div>
          <p
            title={smallestDepartment?.names.join(", ")}
            className="mt-0.5 text-[10px] font-medium text-emerald-600/80 dark:text-emerald-300/80 truncate leading-tight"
          >
            {smallestDepartment
              ? smallestDepartment.names.length === 1
                ? "Active employees in this team"
                : `Smallest teams: ${smallestDepartment.names.join(", ")}`
              : "No active teams to compare"}
          </p>
          <Users className="absolute -bottom-2 -right-2 size-12 text-emerald-500/10 pointer-events-none group-hover:text-emerald-500/15 transition-colors" />
        </div>

        {/* Card 4: Employees Added This Month */}
        <div className="group relative overflow-hidden rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/90 via-amber-50/40 to-orange-100/60 dark:from-amber-950/40 dark:via-amber-950/20 dark:to-orange-900/30 p-2.5 sm:px-3 shadow-2xs hover:shadow-xs hover:border-amber-400/80 hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 truncate">
              Employees Added This Month
            </span>
            <div className="flex size-6 items-center justify-center rounded-md bg-amber-500 text-white shadow-2xs shrink-0">
              <UserRoundPlus className="size-3" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-1.5">
            <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-amber-950 dark:text-amber-50 leading-none">
              {statsLoading ? (
                <Skeleton className="h-6 w-10 rounded-md bg-amber-200/50" />
              ) : (
                employeesAddedThisMonthCount
              )}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium bg-amber-100/90 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 border border-amber-200/80 dark:border-amber-800">
              <span>This month</span>
            </span>
          </div>
          <p className="mt-0.5 text-[10px] font-medium text-amber-600/80 dark:text-amber-300/80 truncate leading-tight">
            New employee records created this month
          </p>
          <UserRoundPlus className="absolute -bottom-2 -right-2 size-12 text-amber-500/10 pointer-events-none group-hover:text-amber-500/15 transition-colors" />
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
            headerSticky: true,
          }}
          tableClassNames={{
            base: "w-full min-w-full",
            headerSticky: "sticky top-0 z-20 bg-white",
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
