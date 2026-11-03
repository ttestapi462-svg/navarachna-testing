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

export interface CustomerReferenceCloth {
  id: number;
  orderId?: number | null;
  orderNumber?: string | null;
  customerId: number;
  itemName: string;
  statusId?: number | null;
  statusName?: string | null;
  receivedDate?: string | null;
  returnedDate?: string | null;
  remarks?: string | null;
  createdAt: string;
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
  pageNumber: number;
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
