import { mobileApiClient, mobileApiFetch } from "./api-client";
import { File as ExpoFile } from "expo-file-system";

export interface EmployeeDocument {
  id: number;
  documentType: EmployeeDocumentType;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export type EmployeeDocumentType = 1 | 2 | 3;

export function getEmployeeDocumentFileName(documentType: EmployeeDocumentType, originalFileName: string) {
  if (documentType === 3) return originalFileName;
  const extension = originalFileName.match(/\.[^.]+$/)?.[0] ?? "";
  const baseName = documentType === 1 ? "Aadhaar" : "PAN";
  return `${baseName}${extension}`;
}

export interface EmployeeDocumentFile {
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number | null;
  /** Present for web picker assets; native uploads use the URI descriptor below. */
  file?: Blob;
}

export interface EmployeeRecord {
  id: number;
  firstName: string;
  lastName: string | null;
  email: string;
  mobile: string;
  panMasked: string | null;
  aadhaarMasked: string | null;
  panNumber?: string | null;
  aadhaarNumber?: string | null;
  department: string;
  salary: number | null;
  dateOfJoining: string;
  isActive: boolean;
  createdAt: string;
  version: number;
  documents: EmployeeDocument[];
  createdByUsername?: string | null;
  updatedAt?: string | null;
  updatedByUsername?: string | null;
  loginUsername?: string | null;
}

export interface EmployeePayload {
  firstName: string;
  lastName?: string;
  email: string;
  mobile: string;
  panNumber?: string;
  aadhaarNumber?: string;
  department: string;
  salary?: number | null;
  dateOfJoining: string;
  credentials?: { username: string; password: string };
  version?: number;
}

export interface PagedEmployees {
  items: EmployeeRecord[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface EmployeeQuery {
  search?: string;
  department?: string;
  page?: number;
  pageSize?: number;
}

export async function fetchEmployeesApi(query: EmployeeQuery = {}) {
  const params = new URLSearchParams();
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.department) params.set("department", query.department);
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  const queryString = params.toString();
  const suffix = queryString ? `?${queryString}` : "";
  return mobileApiClient<PagedEmployees>(`/api/v1/employees${suffix}`);
}

export function createEmployeeApi(payload: EmployeePayload) {
  return mobileApiClient<EmployeeRecord>("/api/v1/employees", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateEmployeeApi(id: number, payload: EmployeePayload) {
  return mobileApiClient<EmployeeRecord>(`/api/v1/employees/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteEmployeeApi(id: number) {
  return mobileApiClient<void>(`/api/v1/employees/${id}`, { method: "DELETE" });
}

export function fetchEmployeeLoginStatusApi(id: number) {
  return mobileApiClient<{ hasLogin: boolean }>(`/api/v1/employees/${id}/login`);
}

export function removeEmployeeLoginApi(id: number) {
  return mobileApiClient<void>(`/api/v1/employees/${id}/login`, { method: "DELETE" });
}

export function downloadEmployeeDocumentApi(employeeId: number, documentId: number, signal?: AbortSignal) {
  return mobileApiFetch(`/api/v1/employees/${employeeId}/documents/${documentId}/download`, { signal });
}

export async function deleteEmployeeDocumentApi(employeeId: number, documentId: number) {
  await mobileApiFetch(`/api/v1/employees/${employeeId}/documents/${documentId}`, { method: "DELETE" });
}

export async function uploadEmployeeDocumentApi(
  employeeId: number,
  documentType: EmployeeDocumentType,
  file: EmployeeDocumentFile,
) {
  const formData = new FormData();
  formData.append("documentType", String(documentType));
  const uploadFileName = getEmployeeDocumentFileName(documentType, file.name);
  if (file.file) {
    formData.append("file", file.file, uploadFileName);
  } else {
    // Expo's fetch implementation serializes Blob-like values with bytes();
    // React Native's { uri, name, type } FormData part is not supported there.
    const nativeFile = new ExpoFile(file.uri);
    const filePart = {
      name: uploadFileName,
      type: file.mimeType || nativeFile.type || "application/octet-stream",
      bytes: () => nativeFile.bytes(),
    };
    formData.append("file", filePart as unknown as Blob);
  }

  const response = await mobileApiFetch(
    `/api/v1/employees/${employeeId}/documents`,
    { method: "POST", body: formData },
  );
  return await response.json() as EmployeeDocument;
}
