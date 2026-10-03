export const PROJECT_PROGRESS_STATUSES = [
  "in_progress",
  "completed",
  "cancelled",
] as const;

/** Status lanjutan pengerjaan proyek (di-set oleh freelancer/pemilik proyek). */
export type ProjectProgressStatus = (typeof PROJECT_PROGRESS_STATUSES)[number];

/** Selaras dengan enum Postgres `order_status` di Supabase. */
export const PROJECT_STATUSES = [
  "pending",
  "accepted",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/** Jenis kebutuhan proyek IT & tugas. */
export const PROJECT_CATEGORIES = [
  "assignment",
  "bug_fix",
  "web",
  "scripting",
] as const;

export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];

export function isProjectCategory(value: string): value is ProjectCategory {
  return (PROJECT_CATEGORIES as readonly string[]).includes(value);
}

/** Preferensi hasil/output yang diharapkan klien dari pengerjaan proyek. */
export const PROJECT_DELIVERIES = [
  "source_code",
  "deployment",
  "documentation",
  "other",
] as const;

export type ProjectDelivery = (typeof PROJECT_DELIVERIES)[number];

export function isProjectDelivery(value: string): value is ProjectDelivery {
  return (PROJECT_DELIVERIES as readonly string[]).includes(value);
}

/** Merepresentasikan satu baris tabel `public.coding_projects` di Supabase. */
export interface CodingProject {
  id: string;
  client_id: string;
  freelancer_id: string | null;
  title: string;
  description: string;
  budget: number;
  status: ProjectStatus;
  created_at: string;
}

/** Hasil standar yang dikembalikan oleh seluruh Server Action fitur projects. */
export interface ProjectActionResult {
  status: "success" | "error";
  message: string;
  fieldErrors?: Record<string, string>;
}
