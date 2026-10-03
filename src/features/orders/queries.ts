import { getAcademicServiceTypeMeta } from "@/features/academic/service-types";
import type { AcademicServiceType } from "@/features/academic/types";
import { formatRelativeTime, formatRupiah, getUrlLabel } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { orderDetailParamSchema } from "./schemas";
import type { OrderRole, OrderStatus, OrderSummary } from "./types";

interface JastipRow {
  id: string;
  user_id: string;
  courier_id: string | null;
  item_name: string;
  dropoff_location: string;
  delivery_tip: number;
  status: OrderStatus;
  created_at: string;
}

interface PrintRow {
  id: string;
  document_url: string;
  copies: number;
  delivery_location: string | null;
  status: OrderStatus;
  created_at: string;
}

interface ProjectRow {
  id: string;
  client_id: string;
  freelancer_id: string | null;
  title: string;
  budget: number;
  status: OrderStatus;
  created_at: string;
}

interface TutoringRow {
  id: string;
  student_id: string;
  tutor_id: string | null;
  subject: string;
  price: number;
  status: OrderStatus;
  created_at: string;
}

interface AcademicRow {
  id: string;
  service_type: AcademicServiceType;
  status: OrderStatus;
  created_at: string;
}

/** Kolom ringkas yang dibutuhkan read-model pesanan (dipakai list & detail). */
const JASTIP_SUMMARY_SELECT =
  "id, user_id, courier_id, item_name, dropoff_location, delivery_tip, status, created_at";
const PRINT_SUMMARY_SELECT =
  "id, document_url, copies, delivery_location, status, created_at";
const PROJECT_SUMMARY_SELECT =
  "id, client_id, freelancer_id, title, budget, status, created_at";
const TUTORING_SUMMARY_SELECT =
  "id, student_id, tutor_id, subject, price, status, created_at";
const ACADEMIC_SUMMARY_SELECT = "id, service_type, status, created_at";

function roleOf(isOwner: boolean): OrderRole {
  return isOwner ? "owner" : "partner";
}

function toJastipSummaries(
  rows: JastipRow[] | null,
  userId: string,
  now: Date,
): OrderSummary[] {
  return (rows ?? []).map((row) => ({
    id: row.id,
    service: "jastip",
    title: row.item_name,
    subtitle: `Antar ke ${row.dropoff_location}`,
    amountLabel: `Ongkir ${formatRupiah(row.delivery_tip)}`,
    status: row.status,
    role: roleOf(row.user_id === userId),
    createdAt: row.created_at,
    createdLabel: formatRelativeTime(row.created_at, now),
    amount: row.delivery_tip,
  }));
}

function toPrintSummaries(rows: PrintRow[] | null, now: Date): OrderSummary[] {
  return (rows ?? []).map((row) => ({
    id: row.id,
    service: "printing",
    title: getUrlLabel(row.document_url),
    subtitle: `${row.copies} salinan · ${row.delivery_location ?? "Lokasi belum diisi"}`,
    // Harga cetak dikonfirmasi mitra via WhatsApp, jadi belum ada tagihan di muka.
    amountLabel: null,
    status: row.status,
    role: "owner",
    createdAt: row.created_at,
    createdLabel: formatRelativeTime(row.created_at, now),
    amount: null,
  }));
}

function toProjectSummaries(
  rows: ProjectRow[] | null,
  userId: string,
  now: Date,
): OrderSummary[] {
  return (rows ?? []).map((row) => ({
    id: row.id,
    service: "projects",
    title: row.title,
    subtitle: "Marketplace proyek IT",
    amountLabel: `Budget ${formatRupiah(row.budget)}`,
    status: row.status,
    role: roleOf(row.client_id === userId),
    createdAt: row.created_at,
    createdLabel: formatRelativeTime(row.created_at, now),
    amount: row.budget,
  }));
}

function toTutoringSummaries(
  rows: TutoringRow[] | null,
  userId: string,
  now: Date,
): OrderSummary[] {
  return (rows ?? []).map((row) => ({
    id: row.id,
    service: "tutoring",
    title: row.subject,
    subtitle: "Sesi belajar privat",
    amountLabel: `Tarif ${formatRupiah(row.price)}`,
    status: row.status,
    role: roleOf(row.student_id === userId),
    createdAt: row.created_at,
    createdLabel: formatRelativeTime(row.created_at, now),
    amount: row.price,
  }));
}

function toAcademicSummaries(
  rows: AcademicRow[] | null,
  now: Date,
): OrderSummary[] {
  return (rows ?? []).map((row) => ({
    id: row.id,
    service: "academic",
    title: getAcademicServiceTypeMeta(row.service_type).label,
    subtitle: "Asisten makalah & akademik",
    amountLabel: null,
    status: row.status,
    role: "owner",
    createdAt: row.created_at,
    createdLabel: formatRelativeTime(row.created_at, now),
    amount: null,
  }));
}

/**
 * Ringkasan seluruh transaksi user dari 5 tabel layanan (read-model lintas
 * bounded context). Hanya memuat baris yang relevan dengan user (owner/partner)
 * sehingga filter di sini + RLS menjaga data isolation.
 */
export async function fetchOrderSummaries(): Promise<OrderSummary[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return [];
  }

  const userId = data.user.id;

  const [jastip, printing, projects, tutoring, academic] = await Promise.all([
    supabase
      .from("jastip_orders")
      .select(JASTIP_SUMMARY_SELECT)
      .or(`user_id.eq.${userId},courier_id.eq.${userId}`)
      .order("created_at", { ascending: false }),
    supabase
      .from("print_orders")
      .select(PRINT_SUMMARY_SELECT)
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("coding_projects")
      .select(PROJECT_SUMMARY_SELECT)
      .or(`client_id.eq.${userId},freelancer_id.eq.${userId}`)
      .order("created_at", { ascending: false }),
    supabase
      .from("tutoring_sessions")
      .select(TUTORING_SUMMARY_SELECT)
      .or(`student_id.eq.${userId},tutor_id.eq.${userId}`)
      .order("created_at", { ascending: false }),
    supabase
      .from("academic_services")
      .select(ACADEMIC_SUMMARY_SELECT)
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  const now = new Date();
  const summaries: OrderSummary[] = [
    ...toJastipSummaries(jastip.data as JastipRow[] | null, userId, now),
    ...toPrintSummaries(printing.data as PrintRow[] | null, now),
    ...toProjectSummaries(projects.data as ProjectRow[] | null, userId, now),
    ...toTutoringSummaries(tutoring.data as TutoringRow[] | null, userId, now),
    ...toAcademicSummaries(academic.data as AcademicRow[] | null, now),
  ];

  return summaries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Baris tunggal dari `maybeSingle()`; error (termasuk 0 baris) dianggap tidak ada. */
function rowOrNull<T>(result: {
  data: T | null;
  error: unknown;
}): T | null {
  return result.error ? null : result.data;
}

/**
 * Detail satu pesanan untuk halaman `/orders/[orderId]`. Kueri paralel ke 5
 * tabel layanan; RLS membatasi baris yang terlihat oleh user login sehingga
 * tidak ada data silang antar user. `null` bila tidak ditemukan/tidak valid.
 */
export async function fetchOrderDetail(
  orderId: string,
): Promise<OrderSummary | null> {
  const parsed = orderDetailParamSchema.safeParse({ orderId });
  if (!parsed.success) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return null;
  }

  const userId = data.user.id;
  const [jastip, printing, projects, tutoring, academic] = await Promise.all([
    supabase
      .from("jastip_orders")
      .select(JASTIP_SUMMARY_SELECT)
      .eq("id", parsed.data.orderId)
      .maybeSingle(),
    supabase
      .from("print_orders")
      .select(PRINT_SUMMARY_SELECT)
      .eq("id", parsed.data.orderId)
      .maybeSingle(),
    supabase
      .from("coding_projects")
      .select(PROJECT_SUMMARY_SELECT)
      .eq("id", parsed.data.orderId)
      .maybeSingle(),
    supabase
      .from("tutoring_sessions")
      .select(TUTORING_SUMMARY_SELECT)
      .eq("id", parsed.data.orderId)
      .maybeSingle(),
    supabase
      .from("academic_services")
      .select(ACADEMIC_SUMMARY_SELECT)
      .eq("id", parsed.data.orderId)
      .maybeSingle(),
  ]);

  const jastipRow = rowOrNull(jastip) as JastipRow | null;
  const printRow = rowOrNull(printing) as PrintRow | null;
  const projectRow = rowOrNull(projects) as ProjectRow | null;
  const tutoringRow = rowOrNull(tutoring) as TutoringRow | null;
  const academicRow = rowOrNull(academic) as AcademicRow | null;

  const now = new Date();
  const candidates: (OrderSummary | null)[] = [
    jastipRow ? toJastipSummaries([jastipRow], userId, now)[0] : null,
    printRow ? toPrintSummaries([printRow], now)[0] : null,
    projectRow ? toProjectSummaries([projectRow], userId, now)[0] : null,
    tutoringRow ? toTutoringSummaries([tutoringRow], userId, now)[0] : null,
    academicRow ? toAcademicSummaries([academicRow], now)[0] : null,
  ];

  return (
    candidates.find(
      (candidate): candidate is OrderSummary => candidate !== null,
    ) ?? null
  );
}

