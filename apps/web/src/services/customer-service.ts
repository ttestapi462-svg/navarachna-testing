"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  Customer,
  CustomerCreateDto,
  CustomerSummary,
  CustomerReferenceCloth,
  CustomerPayment,
  CustomerMeasurement,
  PaginatedCustomersResponse,
  CustomerFilterParams,
} from "@/types/customer";

// ─── Query Keys ──────────────────────────────────────────
export const customerKeys = {
  all: ["customers"] as const,
  lists: () => [...customerKeys.all, "list"] as const,
  list: (params: CustomerFilterParams) =>
    [...customerKeys.lists(), params] as const,
  details: () => [...customerKeys.all, "detail"] as const,
  detail: (id: number) => [...customerKeys.details(), id] as const,
  summary: (id: number) => [...customerKeys.all, "summary", id] as const,
  payments: (id: number) => [...customerKeys.all, "payments", id] as const,
  referenceCloths: (id: number) =>
    [...customerKeys.all, "reference-cloths", id] as const,
  measurements: (id: number, dressTypeId?: number) =>
    [...customerKeys.all, "measurements", id, dressTypeId] as const,
};

// ─── List Customers (paginated + filtered) ───────────────
export function useCustomers(params: CustomerFilterParams = {}) {
  return useQuery({
    queryKey: customerKeys.list(params),
    queryFn: () => {
      const sp = new URLSearchParams();
      if (params.search) sp.set("search", params.search);
      if (params.mobile) sp.set("mobile", params.mobile);
      if (params.isActive !== undefined)
        sp.set("isActive", String(params.isActive));
      if (params.page) sp.set("page", String(params.page));
      if (params.pageSize) sp.set("pageSize", String(params.pageSize));

      const qs = sp.toString();
      return apiClient<PaginatedCustomersResponse>(
        `/api/Customers${qs ? `?${qs}` : ""}`
      );
    },
  });
}

// ─── Get Single Customer ─────────────────────────────────
export function useCustomer(id: number | null) {
  return useQuery({
    queryKey: customerKeys.detail(id!),
    queryFn: () => apiClient<Customer>(`/api/Customers/${id}`),
    enabled: id !== null && id !== undefined && id > 0,
  });
}

// ─── Get Customer Summary ────────────────────────────────
export function useCustomerSummary(id: number | null) {
  return useQuery({
    queryKey: customerKeys.summary(id!),
    queryFn: () => apiClient<CustomerSummary>(`/api/Customers/${id}/summary`),
    enabled: id !== null && id !== undefined && id > 0,
  });
}

// ─── Get Customer Payments ───────────────────────────────
export function useCustomerPayments(id: number | null) {
  return useQuery({
    queryKey: customerKeys.payments(id!),
    queryFn: async () => {
      const res = await apiClient<{ items: CustomerPayment[] }>(
        `/api/Customers/${id}/payments`
      );
      return res.items || [];
    },
    enabled: id !== null && id !== undefined && id > 0,
  });
}

// ─── Get Customer Reference Cloths ───────────────────────
export function useCustomerReferenceCloths(id: number | null) {
  return useQuery({
    queryKey: customerKeys.referenceCloths(id!),
    queryFn: async () => {
      const res = await apiClient<{ items: CustomerReferenceCloth[] }>(
        `/api/Customers/${id}/reference-cloths`
      );
      return res.items || [];
    },
    enabled: id !== null && id !== undefined && id > 0,
  });
}

// ─── Get Customer Measurements ───────────────────────────
export function useCustomerMeasurements(id: number | null, dressTypeId?: number) {
  return useQuery({
    queryKey: customerKeys.measurements(id!, dressTypeId),
    queryFn: () => {
      const q = dressTypeId ? `?dressTypeId=${dressTypeId}` : "";
      return apiClient<CustomerMeasurement[]>(
        `/api/Customers/${id}/measurements${q}`
      );
    },
    enabled: id !== null && id !== undefined && id > 0,
  });
}

// ─── Create Customer Mutation ────────────────────────────
export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CustomerCreateDto) =>
      apiClient<{ id: number; message: string }>("/api/Customers", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}

// ─── Update Customer Mutation ────────────────────────────
export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CustomerCreateDto }) =>
      apiClient<{ message: string }>(`/api/Customers/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: (_res, { id }) => {
      qc.invalidateQueries({ queryKey: customerKeys.all });
      qc.invalidateQueries({ queryKey: customerKeys.detail(id) });
      qc.invalidateQueries({ queryKey: customerKeys.summary(id) });
    },
  });
}

// ─── Delete Customer Mutation ────────────────────────────
export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient<{ message: string }>(`/api/Customers/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}
