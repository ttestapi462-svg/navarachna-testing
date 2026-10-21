"use client";

import { useState, useMemo, useEffect } from "react";
import { useTable, createColumnHelper } from "@tanstack/react-table";
import { Badge } from "@/components/reui/badge";
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DepartmentComboboxFilter } from "./department-combobox-filter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEmployees } from "@/services/employee-service";
import { DEPARTMENTS } from "@/lib/validations/employee";
import type { EmployeeResponse } from "@/types/employee";
import {
  Search,
  PlusIcon,
  RefreshCw,
  MoreHorizontal,
  Edit3,
  FileText,
  Trash2,
  X,
} from "lucide-react";

interface EmployeeDataGridProps {
  onAddEmployee: () => void;
  onEditEmployee: (employee: EmployeeResponse) => void;
  onViewDocuments: (employee: EmployeeResponse) => void;
  onDeleteEmployee: (employee: EmployeeResponse) => void;
}

const columnHelper = createColumnHelper<DataGridFeatures, EmployeeResponse>();

export function EmployeeDataGrid({
  onAddEmployee,
  onEditEmployee,
  onViewDocuments,
  onDeleteEmployee,
}: EmployeeDataGridProps) {
  // ─── Filter & Search States ────────────────────────────
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Debounce search input by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Query hook
  const { data, isLoading, isFetching, refetch } = useEmployees({
    search: debouncedSearch || undefined,
    department:
      selectedDepartments.length > 0
        ? selectedDepartments.join(",")
        : undefined,
    page,
    pageSize,
  });

  // ─── Column Definitions ────────────────────────────────
  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("firstName", {
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
            return (
              <div className="flex items-center gap-2.5 py-0.5">
                <Avatar className="size-7 rounded-full border border-primary/20 bg-primary/10 text-primary font-semibold text-[11px] shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-[11px]">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate leading-tight">
                    {fullName}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate font-normal leading-tight mt-0.5">
                    {emp.email}
                  </p>
                </div>
              </div>
            );
          },
          size: 240,
        }),
        columnHelper.accessor("department", {
          id: "department",
          header: ({ column }) => (
            <DataGridColumnHeader
              column={column}
              title="Department"
              className="text-xs font-semibold text-foreground/80"
            />
          ),
          cell: (info) => (
            <Badge
              variant="outline"
              className="text-[11px] py-0 px-2 font-medium border-border/80 text-foreground/80 bg-muted/25 whitespace-nowrap"
            >
              {info.getValue()}
            </Badge>
          ),
          size: 140,
        }),
        columnHelper.accessor("designation", {
          id: "designation",
          header: ({ column }) => (
            <DataGridColumnHeader
              column={column}
              title="Designation"
              className="text-xs font-semibold text-foreground/80"
            />
          ),
          cell: (info) => (
            <span className="text-xs font-medium text-foreground/85 truncate block">
              {info.getValue()}
            </span>
          ),
          size: 150,
        }),
        columnHelper.accessor("mobile", {
          id: "mobile",
          header: ({ column }) => (
            <DataGridColumnHeader
              column={column}
              title="Contact"
              className="text-xs font-semibold text-foreground/80"
            />
          ),
          cell: (info) => (
            <span className="font-mono text-xs text-foreground">
              {info.getValue()}
            </span>
          ),
          size: 125,
        }),
        columnHelper.accessor("dateOfJoining", {
          id: "dateOfJoining",
          header: ({ column }) => (
            <DataGridColumnHeader
              column={column}
              title="Joining Date"
              className="text-xs font-semibold text-foreground/80"
            />
          ),
          cell: (info) => {
            const val = info.getValue();
            const d = new Date(val);
            return (
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {isNaN(d.getTime())
                  ? val
                  : d.toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
              </span>
            );
          },
          size: 115,
        }),
        columnHelper.display({
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
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDocuments(emp);
                    }}
                    className="h-6 px-2 text-[11px] gap-1 font-medium text-primary border-primary/25 bg-primary/5 hover:bg-primary/15 rounded-md cursor-pointer"
                  >
                    <FileText className="size-3" />
                    <span>{count} {count === 1 ? "Doc" : "Docs"}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">Manage uploaded documents</p>
                </TooltipContent>
              </Tooltip>
            );
          },
          size: 95,
        }),
        columnHelper.display({
          id: "actions",
          header: "",
          cell: ({ row }) => {
            const emp = row.original;
            return (
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="size-7 text-muted-foreground hover:text-foreground cursor-pointer rounded-md"
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Employee actions"
                      >
                        <MoreHorizontal className="size-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p className="text-xs">Employee options</p>
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent
                  align="end"
                  className="min-w-[160px] w-auto rounded-lg p-1 shadow-md border-border/80 bg-popover/95 backdrop-blur-md"
                >
                  <DropdownMenuLabel className="text-[10px] font-semibold text-muted-foreground/75 uppercase tracking-wider px-2 py-1">
                    Actions
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    className="text-xs font-medium cursor-pointer gap-2 px-2 py-1.5 rounded-md whitespace-nowrap"
                    onClick={() => onEditEmployee(emp)}
                  >
                    <Edit3 className="size-3.5 text-muted-foreground" />
                    Edit Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-xs font-medium cursor-pointer gap-2 px-2 py-1.5 rounded-md whitespace-nowrap"
                    onClick={() => onViewDocuments(emp)}
                  >
                    <FileText className="size-3.5 text-muted-foreground" />
                    Manage Documents
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem
                    className="text-xs font-medium cursor-pointer gap-2 px-2 py-1.5 rounded-md text-destructive focus:text-destructive whitespace-nowrap"
                    onClick={() => onDeleteEmployee(emp)}
                  >
                    <Trash2 className="size-3.5" />
                    Deactivate Employee
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            );
          },
          size: 45,
        }),
      ]),
    [onEditEmployee, onViewDocuments, onDeleteEmployee]
  );

  // TanStack table instance
  const table = useTable({
    features: dataGridFeatures,
    data: data?.items ?? [],
    columns,
    rowCount: data?.totalCount ?? 0,
    state: {
      pagination: {
        pageIndex: page - 1,
        pageSize,
      },
    },
    onPaginationChange: (updater) => {
      const nextPagination =
        typeof updater === "function"
          ? updater({ pageIndex: page - 1, pageSize })
          : updater;
      setPage(nextPagination.pageIndex + 1);
      setPageSize(nextPagination.pageSize);
    },
    manualPagination: true,
  });

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 gap-2.5">
      {/* ─── Toolbar with Filters on Left, Actions on Right ─────── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        {/* Left Side: Search Box + Department Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {/* ReUI InputGroup Search Box */}
          <InputGroup className="w-52 sm:w-64">
            <InputGroupAddon>
              <Search className="size-3.5 text-muted-foreground" />
            </InputGroupAddon>
            <InputGroupInput
              type="text"
              placeholder="Search code, name, email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <InputGroupAddon align="inline-end">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setSearchInput("")}
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                      aria-label="Clear search"
                    >
                      <X className="size-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">Clear search</p>
                  </TooltipContent>
                </Tooltip>
              </InputGroupAddon>
            )}
          </InputGroup>

          {/* Department Multi-Chip Filter using ReUI Combobox */}
          <DepartmentComboboxFilter
            departments={DEPARTMENTS}
            selectedDepartments={selectedDepartments}
            onSelectedChange={(depts) => {
              setSelectedDepartments(depts);
              setPage(1);
            }}
            className="w-56 sm:w-72"
          />
        </div>

        {/* Right Side: Refresh + Register Employee Action */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Refresh Action */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => refetch()}
                disabled={isFetching}
                className="size-8 cursor-pointer rounded-lg border-border/80 text-muted-foreground hover:text-foreground shadow-2xs"
                aria-label="Refresh employee directory"
              >
                <RefreshCw
                  className={`size-3.5 ${isFetching ? "animate-spin text-primary" : ""}`}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">Refresh employee directory</p>
            </TooltipContent>
          </Tooltip>

          {/* Register Employee Action (Primary Background) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                size="sm"
                onClick={onAddEmployee}
                className="h-8 px-3 text-xs gap-1.5 cursor-pointer shadow-xs font-medium rounded-lg"
              >
                <PlusIcon aria-hidden="true" className="size-3.5" />
                Register Employee
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">Add new employee to studio</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* ─── ReUI Data Grid as per official @reui/c-data-grid-6 reference ────── */}
      <DataGrid
        table={table}
        recordCount={data?.totalCount ?? 0}
        isLoading={isLoading}
        tableLayout={{
          width: "auto",
          dense: true,
          headerSticky: true,
          headerBackground: true,
          rowBorder: true,
        }}
        tableClassNames={{
          base: "w-full min-w-full",
          headerSticky: "sticky top-0 z-20 bg-muted/95 backdrop-blur-xs",
        }}
        emptyMessage="No employees found matching your criteria."
      >
        <div className="w-full flex-1 flex flex-col min-h-0">
          <DataGridContainer className="w-full flex-1 min-h-0 rounded-xl border border-border/70 overflow-hidden bg-card shadow-xs flex flex-col">
            <DataGridScrollArea className="size-full flex-1 min-h-0">
              <DataGridTable />
            </DataGridScrollArea>
          </DataGridContainer>
          <div className="shrink-0 pt-2">
            <DataGridPagination sizes={[10, 20, 50, 100]} />
          </div>
        </div>
      </DataGrid>
    </div>
  );
}
