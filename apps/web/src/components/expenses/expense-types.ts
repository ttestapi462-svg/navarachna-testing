export type Expense = {
  id: number;
  expenseDate: string;
  amount: number | string;
  categoryNotes: string;
  sourcingSpecialists: SourcingSpecialist[];
  billFileName: string;
  billUrl?: string;
  createdBy?: number | null;
  createdByUsername?: string | null;
  createdAt?: string;
  updatedAt?: string | null;
  updatedBy?: number | null;
  updatedByUsername?: string | null;
};

export type SourcingSpecialist = {
  id: number;
  firstName: string;
  lastName?: string | null;
  displayName: string;
  mobile?: string | null;
};

export type ExpenseFormValues = {
  expenseDate: string;
  amount: string;
  sourcingSpecialistIds: number[];
  bill?: File | null;
  categoryNotes: string;
};

export type ExpenseGridRow =
  | { kind: "date-group"; id: string; expenseDate: string; expenseCount: number; pageSubtotal: number; children: ExpenseGridRow[] }
  | { kind: "expense"; id: string; expenseDate: string; expense: Expense };

export type BillPreview = {
  expenseId: number;
  url: string;
  contentType: string;
  fileName: string;
};
