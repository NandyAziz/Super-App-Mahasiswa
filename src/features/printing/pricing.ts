import type { BindingType, PrintType } from "./types";

export interface PrintTypeOption {
  value: PrintType;
  label: string;
  pricePerPage: number;
  gradient: string;
  description: string;
}

export const PRINT_TYPE_OPTIONS: readonly PrintTypeOption[] = [
  {
    value: "bw",
    label: "Hitam Putih",
    pricePerPage: 500,
    gradient: "from-zinc-600 to-zinc-800",
    description: "Hemat untuk dokumen teks",
  },
  {
    value: "color",
    label: "Warna",
    pricePerPage: 1500,
    gradient: "from-indigo-500 to-violet-600",
    description: "Untuk gambar & desain",
  },
];

export interface BindingOption {
  value: BindingType;
  label: string;
  price: number;
  description: string;
}

export const BINDING_OPTIONS: readonly BindingOption[] = [
  {
    value: "none",
    label: "Tanpa Jilid",
    price: 0,
    description: "Cukup di-staples",
  },
  {
    value: "soft",
    label: "Soft Cover",
    price: 5000,
    description: "Sampul laminasi",
  },
  {
    value: "hard",
    label: "Hard Cover",
    price: 15000,
    description: "Sampul tebal premium",
  },
];

export interface PrintPriceBreakdown {
  pricePerPage: number;
  pages: number;
  printCost: number;
  bindingCost: number;
  total: number;
}

function getPrintTypeOption(printType: PrintType): PrintTypeOption {
  return (
    PRINT_TYPE_OPTIONS.find((option) => option.value === printType) ??
    PRINT_TYPE_OPTIONS[0]
  );
}

function getBindingOption(bindingType: BindingType): BindingOption {
  return (
    BINDING_OPTIONS.find((option) => option.value === bindingType) ??
    BINDING_OPTIONS[0]
  );
}

/**
 * Satu sumber kebenaran kalkulasi harga cetak — dipakai bersama oleh
 * Server Action (estimasi resmi) dan UI (pratinjau real-time).
 */
export function calculatePrintPrice(
  printType: PrintType,
  bindingType: BindingType,
  totalPages: number,
): PrintPriceBreakdown {
  const pages = Math.max(0, Math.floor(totalPages));
  const pricePerPage = getPrintTypeOption(printType).pricePerPage;
  const printCost = pages * pricePerPage;
  const bindingCost = getBindingOption(bindingType).price;

  return {
    pricePerPage,
    pages,
    printCost,
    bindingCost,
    total: printCost + bindingCost,
  };
}

export function getPrintTypeLabel(printType: PrintType): string {
  return getPrintTypeOption(printType).label;
}

export function getPrintTypeGradient(printType: PrintType): string {
  return getPrintTypeOption(printType).gradient;
}

export function getBindingLabel(bindingType: BindingType): string {
  return getBindingOption(bindingType).label;
}
