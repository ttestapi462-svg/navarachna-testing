// ─── Employee Management Type Definitions ────────────────
// Mirrors the .NET EmployeeApi.Models DTOs exactly.

export enum DocumentType {
  Aadhaar = 1,
  Pan = 2,
  Other = 3,
}

export const DocumentTypeLabels: Record<DocumentType, string> = {
  [DocumentType.Aadhaar]: "Aadhaar Card",
  [DocumentType.Pan]: "PAN Card",
  [DocumentType.Other]: "Other Document",
};

export interface DocumentResponse {
  id: number;
  documentType: DocumentType;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface EmployeeResponse {
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
  createdBy?: number | null;
  updatedAt?: string | null;
  updatedBy?: number | null;
  createdByUsername?: string | null;
  updatedByUsername?: string | null;
  loginUsername?: string | null;
  version: number;
  documents: DocumentResponse[];
}

export interface EmployeeRequest {
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
  loginUsername?: string;
  loginPassword?: string;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface EmployeeListParams {
  search?: string;
  department?: string;
  page?: number;
  pageSize?: number;
}
