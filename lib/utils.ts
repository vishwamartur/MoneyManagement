import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function validateGSTIN(gstin: string): boolean {
  // GSTIN format: 29ABCDE1234F1Z5
  // 29 - State code (Karnataka)
  // ABCDE1234F - PAN
  // 1 - Entity number
  // Z - Check digit
  // 5 - Default for all taxpayers
  const gstinRegex = /^29[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinRegex.test(gstin);
}

export function generateBillNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV${year}${month}${random}`;
}

// Utility function to format date
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// Utility function to calculate GST
export function calculateGST(amount: number): { cgst: number; sgst: number; total: number } {
  const cgst = amount * 0.09;
  const sgst = amount * 0.09;
  const total = amount + cgst + sgst;
  return { cgst, sgst, total };
}
