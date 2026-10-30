"use client";

import { useRef } from "react";
import { flexRender } from "@tanstack/react-table";
import {
  useLegacyTable as useTable,
  legacyCreateColumnHelper as createColumnHelper,
  getCoreRowModel,
} from "@tanstack/react-table/legacy";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

export interface StudioOrder {
  id: string;
  client: string;
  garmentType: string;
  status: "In Cutting" | "Hand Embroidery" | "Final Fitting" | "Ready";
  designer: string;
  deadline: string;
}

const mockOrders: StudioOrder[] = Array.from({ length: 100 }, (_, i) => ({
  id: `NVR-${1000 + i}`,
  client: [
    "Aarav Mehta",
    "Diya Sharma",
    "Rohan Patel",
    "Ananya Reddy",
    "Vikram Malhotra",
  ][i % 5],
  garmentType: [
    "Bespoke Sherwani",
    "Bridal Zardozi Lehenga",
    "Couture Tuxedo",
    "Hand-woven Anarkali",
    "Silk Sari Gown",
  ][i % 5],
  status: (["In Cutting", "Hand Embroidery", "Final Fitting", "Ready"] as const)[
    i % 4
  ],
  designer: ["Master Rajesh", "Atelier Priya", "Couturier Karan"][i % 3],
  deadline: `Oct ${20 + (i % 10)}, 2026`,
}));

const columnHelper = createColumnHelper<StudioOrder>();

const columns = [
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
];

export function OrdersVirtualTable() {

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

  return (
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
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/60 sticky top-0 z-10 border-b border-border/70 shadow-2xs">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="p-3 font-semibold text-foreground/80"
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
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
                        <td
                          key={cell.id}
                          className="p-3 flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
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
  );
}
