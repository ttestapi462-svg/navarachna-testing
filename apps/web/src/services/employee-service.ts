"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, getStoredToken } from "@/lib/api-client";
import type {
  EmployeeResponse,
  EmployeeRequest,
  PagedResult,
  EmployeeListParams,
  DocumentResponse,
  DocumentType,
} from "@/types/employee";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5207";

// ─── Query Keys ──────────────────────────────────────────
export const employeeKeys = {
  all: ["employees"] as const,
  lists: () => [...employeeKeys.all, "list"] as const,
  list: (params: EmployeeListParams) =>
    [...employeeKeys.lists(), params] as const,
  details: () => [...employeeKeys.all, "detail"] as const,
  detail: (id: number) => [...employeeKeys.details(), id] as const,
  documents: (employeeId: number) =>
    [...employeeKeys.all, "documents", employeeId] as const,
};

// ─── List Employees (paginated + filtered) ───────────────
export function useEmployees(params: EmployeeListParams = {}) {
  return useQuery({
    queryKey: employeeKeys.list(params),
    queryFn: () => {
      const sp = new URLSearchParams();
      if (params.search) sp.set("search", params.search);
      if (params.department) sp.set("department", params.department);
      if (params.page) sp.set("page", String(params.page));
      if (params.pageSize) sp.set("pageSize", String(params.pageSize));
      const qs = sp.toString();
      return apiClient<PagedResult<EmployeeResponse>>(
        `/api/v1/employees${qs ? `?${qs}` : ""}`
      );
    },
  });
}

// ─── Get Single Employee ─────────────────────────────────
export function useEmployee(id: number | null) {
  return useQuery({
    queryKey: employeeKeys.detail(id!),
    queryFn: () => apiClient<EmployeeResponse>(`/api/v1/employees/${id}`),
    enabled: id !== null && id !== undefined,
  });
}

// ─── Create Employee ─────────────────────────────────────
export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: EmployeeRequest) =>
      apiClient<EmployeeResponse>("/api/v1/employees", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employeeKeys.lists() });
    },
  });
}

// ─── Update Employee ─────────────────────────────────────
export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: EmployeeRequest }) =>
      apiClient<EmployeeResponse>(`/api/v1/employees/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: employeeKeys.lists() });
      qc.invalidateQueries({ queryKey: employeeKeys.detail(variables.id) });
    },
  });
}

// ─── Delete Employee (Soft) ──────────────────────────────
export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient(`/api/v1/employees/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employeeKeys.lists() });
    },
  });
}

// ─── Remove Employee Login ───────────────────────────────
// True when the employee currently has a usable login account.
export async function getEmployeeLoginStatus(
  employeeId: number
): Promise<{ hasLogin: boolean }> {
  return apiClient<{ hasLogin: boolean }>(
    `/api/v1/employees/${employeeId}/login`
  );
}

export function useRemoveEmployeeLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient(`/api/v1/employees/${id}/login`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employeeKeys.lists() });
    },
  });
}

// ─── Documents ───────────────────────────────────────────
export function useEmployeeDocuments(employeeId: number | null) {
  return useQuery({
    queryKey: employeeKeys.documents(employeeId!),
    queryFn: () =>
      apiClient<DocumentResponse[]>(
        `/api/v1/employees/${employeeId}/documents`
      ),
    enabled: employeeId !== null && employeeId !== undefined,
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      employeeId,
      documentType,
      file,
    }: {
      employeeId: number;
      documentType: DocumentType;
      file: File;
    }) => {
      const formData = new FormData();
      formData.append("documentType", String(documentType));
      formData.append("file", file);

      const token = getStoredToken();
      const res = await fetch(
        `${API_BASE_URL}/api/v1/employees/${employeeId}/documents`,
        {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          err.title || err.message || `Upload failed (${res.status})`
        );
      }

      return res.json() as Promise<DocumentResponse>;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({
        queryKey: employeeKeys.documents(variables.employeeId),
      });
      qc.invalidateQueries({ queryKey: employeeKeys.lists() });
    },
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      employeeId,
      docId,
    }: {
      employeeId: number;
      docId: number;
    }) =>
      apiClient(`/api/v1/employees/${employeeId}/documents/${docId}`, {
        method: "DELETE",
      }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({
        queryKey: employeeKeys.documents(variables.employeeId),
      });
      qc.invalidateQueries({ queryKey: employeeKeys.lists() });
    },
  });
}

export async function getDocumentPreviewUrl(
  employeeId: number,
  docId: number
): Promise<{ url: string; contentType: string }> {
  const token = getStoredToken();
  const res = await fetch(
    `${API_BASE_URL}/api/v1/employees/${employeeId}/documents/${docId}/download`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  );

  if (!res.ok) throw new Error("Preview failed");

  const blob = await res.blob();
  return { url: URL.createObjectURL(blob), contentType: blob.type };
}

export async function downloadDocument(
  employeeId: number,
  docId: number,
  fileName: string
) {
  const token = getStoredToken();
  const res = await fetch(
    `${API_BASE_URL}/api/v1/employees/${employeeId}/documents/${docId}/download`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  );

  if (!res.ok) throw new Error("Download failed");

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
