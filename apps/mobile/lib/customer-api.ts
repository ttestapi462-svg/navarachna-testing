import { mobileApiClient } from "./api-client";

export interface Customer {
  id: number;
  name: string;
  mobileNumber: string;
  whatsappNumber?: string | null;
  alternateMobile?: string | null;
  address?: string | null;
  area?: string | null;
  city?: string | null;
  remarks?: string | null;
  profilePhotoUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  createdBy?: number | null;
  createdByUsername?: string | null;
  updatedAt?: string | null;
  updatedBy?: number | null;
  updatedByUsername?: string | null;
}

export interface CustomerCreateDto {
  name: string;
  mobileNumber: string;
  whatsappNumber?: string | null;
  alternateMobile?: string | null;
  address?: string | null;
  area?: string | null;
  city?: string | null;
  remarks?: string | null;
  profilePhotoUrl?: string | null;
  isActive: boolean;
}

export interface CustomerSummary {
  customerId: number;
  totalOrders: number;
  totalBusinessValue: number;
  totalPaid: number;
  outstandingBalance: number;
}

export interface CustomerPayment {
  id: number;
  orderId: number;
  orderNumber?: string | null;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber?: string | null;
  receiptPhotoUrl?: string | null;
  remarks?: string | null;
}

export interface CustomerMeasurement {
  id: number;
  orderItemId?: number | null;
  orderNumber?: string | null;
  dressTypeId?: number | null;
  dressTypeName?: string | null;
  presetSize?: string | null;
  dynamicValues?: string | null;
  specialInstructions?: string | null;
  referenceClothDetails?: string | null;
  measurementPhotoUrl?: string | null;
  designPhotoUrl?: string | null;
  createdAt: string;
}

export interface PaginatedCustomersResponse {
  data: Customer[];
  items?: Customer[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export interface CustomerFilterParams {
  search?: string;
  mobile?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export async function fetchCustomersApi(
  params: CustomerFilterParams = {}
): Promise<PaginatedCustomersResponse> {
  const query = new URLSearchParams();
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.mobile?.trim()) query.set("mobile", params.mobile.trim());
  if (params.isActive !== undefined) query.set("isActive", String(params.isActive));
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.pageSize !== undefined) query.set("pageSize", String(params.pageSize));

  const qs = query.toString();
  return await mobileApiClient<PaginatedCustomersResponse>(
    `/api/Customers${qs ? `?${qs}` : ""}`
  );
}

export async function fetchCustomerByIdApi(id: number): Promise<Customer> {
  return await mobileApiClient<Customer>(`/api/Customers/${id}`);
}

export async function fetchCustomerSummaryApi(id: number): Promise<CustomerSummary> {
  return await mobileApiClient<CustomerSummary>(`/api/Customers/${id}/summary`);
}

export async function fetchCustomerPaymentsApi(id: number): Promise<CustomerPayment[]> {
  const res = await mobileApiClient<{ items: CustomerPayment[] }>(
    `/api/Customers/${id}/payments`
  );
  return res.items || [];
}

export async function fetchCustomerMeasurementsApi(
  id: number,
  dressTypeId?: number
): Promise<CustomerMeasurement[]> {
  const q = dressTypeId ? `?dressTypeId=${dressTypeId}` : "";
  return await mobileApiClient<CustomerMeasurement[]>(
    `/api/Customers/${id}/measurements${q}`
  );
}

export async function createCustomerApi(
  dto: CustomerCreateDto
): Promise<{ id: number; message: string }> {
  return await mobileApiClient<{ id: number; message: string }>("/api/Customers", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export async function updateCustomerApi(
  id: number,
  dto: CustomerCreateDto
): Promise<{ message: string }> {
  return await mobileApiClient<{ message: string }>(`/api/Customers/${id}`, {
    method: "PUT",
    body: JSON.stringify(dto),
  });
}

export async function deleteCustomerApi(
  id: number
): Promise<{ message: string }> {
  return await mobileApiClient<{ message: string }>(`/api/Customers/${id}`, {
    method: "DELETE",
  });
}
