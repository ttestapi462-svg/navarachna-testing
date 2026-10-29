"use client";

import { useState, useCallback } from "react";
import { EmployeeDataGrid } from "@/components/employees/employee-data-grid";
import { EmployeeFormSheet } from "@/components/employees/employee-form-sheet";
import { EmployeeDocumentsSheet } from "@/components/employees/employee-documents-sheet";
import { EmployeeDeleteDialog } from "@/components/employees/employee-delete-dialog";
import { EmployeeRemoveLoginDialog } from "@/components/employees/employee-remove-login-dialog";
import { getEmployeeLoginStatus } from "@/services/employee-service";
import type { EmployeeResponse } from "@/types/employee";
import { toast } from "@/components/ui/sonner";

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

  const [removeLoginOpen, setRemoveLoginOpen] = useState(false);
  const [removeLoginEmployee, setRemoveLoginEmployee] =
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

  const handleRemoveLogin = useCallback(async (emp: EmployeeResponse) => {
    try {
      const { hasLogin } = await getEmployeeLoginStatus(emp.id);
      if (!hasLogin) {
        toast.info("Login access already revoked", {
          description: `Login credentials for ${`${emp.firstName} ${emp.lastName || ""}`.trim()} have already been revoked`,
        });
        return;
      }
      setRemoveLoginEmployee(emp);
      setRemoveLoginOpen(true);
    } catch (err: unknown) {
      toast.error("Failed to check login status", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  }, []);

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 h-full">
      <EmployeeDataGrid
        onAddEmployee={handleAddEmployee}
        onEditEmployee={handleEditEmployee}
        onViewDocuments={handleViewDocuments}
        onDeleteEmployee={handleDeleteEmployee}
        onRemoveLogin={handleRemoveLogin}
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

      <EmployeeRemoveLoginDialog
        open={removeLoginOpen}
        onOpenChange={setRemoveLoginOpen}
        employee={removeLoginEmployee}
      />
    </div>
  );
}
