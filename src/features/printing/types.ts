export const PRINT_PROGRESS_STATUSES = [
  "accepted",
  "in_progress",
  "completed",
  "cancelled",
] as const;

/** Status lanjutan yang boleh di-set mitra fotokopi / admin. */
export type PrintProgressStatus = (typeof PRINT_PROGRESS_STATUSES)[number];

/** Selaras dengan enum Postgres `order_status` di Supabase. */
export const PRINT_STATUSES = ["pending", ...PRINT_PROGRESS_STATUSES] as const;

export type PrintStatus = (typeof PRINT_STATUSES)[number];

export const PRINT_TYPES = ["bw", "color"] as const;
export type PrintType = (typeof PRINT_TYPES)[number];

export const BINDING_TYPES = ["none", "soft", "hard"] as const;
export type BindingType = (typeof BINDING_TYPES)[number];

/** Ukuran kertas yang didukung layanan cetak. */
export const PRINT_PAPER_SIZES = ["a4", "f4"] as const;
export type PrintPaperSize = (typeof PRINT_PAPER_SIZES)[number];

/** Sisi cetak: satu sisi atau bolak-balik (duplex). */
export const PRINT_SIDES = ["single", "duplex"] as const;
export type PrintSide = (typeof PRINT_SIDES)[number];

/** Opsi finishing dokumen. */
export const PRINT_FINISHINGS = ["none", "staples", "lakban", "spiral"] as const;
export type PrintFinishing = (typeof PRINT_FINISHINGS)[number];

/** Merepresentasikan satu baris tabel `public.print_orders` di Supabase. */
export interface PrintOrder {
  id: string;
  user_id: string;
  document_url: string;
  print_type: PrintType;
  binding_type: BindingType;
  total_pages: number;
  status: PrintStatus;
  created_at: string;
  /** Kontak WhatsApp pemesan (wajib diisi pada form). */
  contact_whatsapp: string | null;
  /** Lokasi antar/pengambilan hasil cetak. */
  delivery_location: string | null;
  /** Catatan kebutuhan khusus dari pemesan. */
  custom_note: string | null;
  paper_size: PrintPaperSize | null;
  sides: PrintSide | null;
  copies: number;
}

/** Hasil standar yang dikembalikan oleh seluruh Server Action fitur printing. */
export interface PrintActionResult {
  status: "success" | "error";
  message: string;
  fieldErrors?: Record<string, string>;
}

export function isPrintType(value: string): value is PrintType {
  return (PRINT_TYPES as readonly string[]).includes(value);
}

export function isBindingType(value: string): value is BindingType {
  return (BINDING_TYPES as readonly string[]).includes(value);
}

export function isPrintPaperSize(value: string): value is PrintPaperSize {
  return (PRINT_PAPER_SIZES as readonly string[]).includes(value);
}

export function isPrintSide(value: string): value is PrintSide {
  return (PRINT_SIDES as readonly string[]).includes(value);
}

export function isPrintFinishing(value: string): value is PrintFinishing {
  return (PRINT_FINISHINGS as readonly string[]).includes(value);
}

