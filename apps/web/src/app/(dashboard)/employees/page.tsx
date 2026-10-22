"use client";

import { useState, useCallback } from "react";
import { EmployeeDataGrid } from "@/components/employees/employee-data-grid";
import { EmployeeFormSheet } from "@/components/employees/employee-form-sheet";
import { EmployeeDocumentsSheet } from "@/components/employees/employee-documents-sheet";
import { EmployeeDeleteDialog } from "@/components/employees/employee-delete-dialog";
import type { EmployeeResponse } from "@/types/employee";

export default function EmployeesPage() {
  // ─── Sheet / Dialog State ──────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] =
    useState<EmployeeResponse | null>(null);

  const [docsOpen, setDocsOpen] = useState(false);
  const [docsEmployee, setDocsEmployee] =
    useState<EmployeeResponse | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingEmployee, setDeletingEmployee] =
    useState<EmployeeResponse | null>(null);

  // ─── Fast Memoized Callbacks ───────────────────────────
  const handleAddEmployee = useCallback(() => {
    setEditingEmployee(null);
    setFormOpen(true);
  }, []);

  const handleEditEmployee = useCallback((emp: EmployeeResponse) => {
    setEditingEmployee(emp);
    setFormOpen(true);
  }, []);

  const handleViewDocuments = useCallback((emp: EmployeeResponse) => {
    setDocsEmployee(emp);
    setDocsOpen(true);
  }, []);

  const handleDeleteEmployee = useCallback((emp: EmployeeResponse) => {
    setDeletingEmployee(emp);
    setDeleteOpen(true);
  }, []);

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 h-full">
      <EmployeeDataGrid
        onAddEmployee={handleAddEmployee}
        onEditEmployee={handleEditEmployee}
        onViewDocuments={handleViewDocuments}
        onDeleteEmployee={handleDeleteEmployee}
      />

      <EmployeeFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        employee={editingEmployee}
      />

      <EmployeeDocumentsSheet
        open={docsOpen}
        onOpenChange={setDocsOpen}
        employee={docsEmployee}
      />

      <EmployeeDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        employee={deletingEmployee}
      />
    </div>
  );
}
