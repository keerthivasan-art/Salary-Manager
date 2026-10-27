export interface AppUser {
  userId: 'keerthi' | 'mathi';
  displayName: 'Keerthi' | 'Mathi';
}

export interface SalaryEntryInput {
  sno: number;
  data: string; // "DATA" column — employee/particulars label from reference sheet
  accountNumber: string;
  accountName: string;
  ifscCode: string;
  amount: number;
  bankName: string;
}

export interface SalaryEntryRecord extends SalaryEntryInput {
  id: number;
  batchId: number;
}

export interface SalaryBatch {
  id: number;
  month: string; // e.g. "August"
  year: number; // e.g. 2026
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SalaryBatchWithEntries extends SalaryBatch {
  entries: SalaryEntryRecord[];
}

export interface EmployeeRecord {
  id: number;
  employeeName: string;
  accountName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  monthlySalary: number;
  phone?: string;
  joiningDate?: string;
  status: 'active' | 'inactive';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NeftLetterSettings {
  bankName: string;
  branch: string;
  chgNo: string;
  letterDate: string; // DD/MM/YYYY
  month: string;
  year: number;
}

export interface AppSettings {
  shopName: string;
  address: string;
  defaultBankName: string;
  defaultBranch: string;
}

export interface ImportValidationRow {
  rowNumber: number;
  data: SalaryEntryInput | null;
  errors: string[];
}

export interface ImportValidationResult {
  valid: ImportValidationRow[];
  invalid: ImportValidationRow[];
  duplicates: ImportValidationRow[];
}

export interface GeneratedFileResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export type Month = typeof MONTHS[number];
