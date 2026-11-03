"use client";

import { useState, useCallback } from "react";
import { CustomerDataGrid } from "@/components/customers/customer-data-grid";
import { CustomerFormSheet } from "@/components/customers/customer-form-sheet";
import { CustomerProfileSheet } from "@/components/customers/customer-profile-sheet";
import { CustomerDeleteDialog } from "@/components/customers/customer-delete-dialog";
import type { Customer } from "@/types/customer";

export default function CustomersPage() {
  // ─── Sheet & Dialog States ──────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [profileOpen, setProfileOpen] = useState(false);
  const [profileCustomer, setProfileCustomer] = useState<Customer | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);

  // ─── Callbacks ──────────────────────────────────────────
  const handleAddCustomer = useCallback(() => {
    setEditingCustomer(null);
    setFormOpen(true);
  }, []);

  const handleEditCustomer = useCallback((customer: Customer) => {
    setEditingCustomer(customer);
    setFormOpen(true);
  }, []);

  const handleViewProfile = useCallback((customer: Customer) => {
    setProfileCustomer(customer);
    setProfileOpen(true);
  }, []);

  const handleDeleteCustomer = useCallback((customer: Customer) => {
    setDeletingCustomer(customer);
    setDeleteOpen(true);
  }, []);

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 h-full">
      <CustomerDataGrid
        onAddCustomer={handleAddCustomer}
        onEditCustomer={handleEditCustomer}
        onViewProfile={handleViewProfile}
        onDeleteCustomer={handleDeleteCustomer}
      />

      <CustomerFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        customer={editingCustomer}
      />

      <CustomerProfileSheet
        open={profileOpen}
        onOpenChange={setProfileOpen}
        customer={profileCustomer}
        onEdit={handleEditCustomer}
        onDelete={handleDeleteCustomer}
      />

      <CustomerDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        customer={deletingCustomer}
      />
    </div>
  );
}
