export const ACADEMIC_SERVICE_TYPES = [
  "proofreading",
  "data_analysis",
  "report_assistance",
] as const;

export type AcademicServiceType = (typeof ACADEMIC_SERVICE_TYPES)[number];

/**
 * Jenis bantuan akademik yang ditawarkan pada form pengajuan (UI). Dipetakan ke
 * `AcademicServiceType` yang tersedia di database saat disimpan.
 */
export const ACADEMIC_REQUEST_TYPES = [
  "proofreading",
  "layout_citation",
  "turnitin_check",
  "report_guidance",
] as const;

export type AcademicRequestType = (typeof ACADEMIC_REQUEST_TYPES)[number];

export const ACADEMIC_PROGRESS_STATUSES = [
  "accepted",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export type AcademicProgressStatus =
  (typeof ACADEMIC_PROGRESS_STATUSES)[number];

/** Selaras dengan enum Postgres `order_status` di Supabase. */
export const ACADEMIC_STATUSES = [
  "pending",
  "accepted",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export type AcademicStatus = (typeof ACADEMIC_STATUSES)[number];

/** Merepresentasikan satu baris tabel `public.academic_services`. */
export interface AcademicService {
  id: string;
  user_id: string;
  service_type: AcademicServiceType;
  document_url: string | null;
  notes: string | null;
  status: AcademicStatus;
  created_at: string;
}

export interface AcademicActionResult {
  status: "success" | "error";
  message: string;
  fieldErrors?: Record<string, string>;
}
