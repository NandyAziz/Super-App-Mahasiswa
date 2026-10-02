import { getAcademicServiceTypeMeta } from "@/features/academic/service-types";
import type { AcademicServiceType } from "@/features/academic/types";
import {
  calculatePrintPrice,
  getBindingLabel,
  getPrintTypeLabel,
} from "@/features/printing/pricing";
import type { BindingType, PrintType } from "@/features/printing/types";
import type { OrderStatus } from "@/features/orders/types";
import { formatRelativeTime, formatRupiah } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ADMIN_ACTION_STATUSES, ADMIN_REVENUE_STATUSES } from "./status";
import type { AdminOrder, AdminOrdersPayload, AdminOverview } from "./types";

type SupabaseServerClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;

interface JastipRow {
  id: string;
  user_id: string;
  item_name: string;
  dropoff_location: string;
  delivery_tip: number;
  status: OrderStatus;
  created_at: string;
  payment_proof_url: string | null;
}

interface PrintRow {
  id: string;
  user_id: string;
  document_url: string;
  print_type: PrintType;
  binding_type: BindingType;
  total_pages: number;
  status: OrderStatus;
  created_at: string;
  payment_proof_url: string | null;
}

interface ProjectRow {
  id: string;
  client_id: string;
  title: string;
  tech_stack: string[] | null;
  budget: number;
  status: OrderStatus;
  created_at: string;
  payment_proof_url: string | null;
}

interface TutoringRow {
  id: string;
  student_id: string;
  subject: string;
  price: number;
  status: OrderStatus;
  created_at: string;
  payment_proof_url: string | null;
}

interface AcademicRow {
  id: string;
  user_id: string;
  service_type: AcademicServiceType;
  status: OrderStatus;
  created_at: string;
  payment_proof_url: string | null;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
}

const DEFAULT_CUSTOMER_NAME = "Mahasiswa";

/** Kolom ringkas tiap tabel layanan untuk read-model tabel operator. */
const JASTIP_ADMIN_SELECT =
  "id, user_id, item_name, dropoff_location, delivery_tip, status, created_at, payment_proof_url";
const PRINT_ADMIN_SELECT =
  "id, user_id, document_url, print_type, binding_type, total_pages, status, created_at, payment_proof_url";
const PROJECT_ADMIN_SELECT =
  "id, client_id, title, tech_stack, budget, status, created_at, payment_proof_url";
const TUTORING_ADMIN_SELECT =
  "id, student_id, subject, price, status, created_at, payment_proof_url";
const ACADEMIC_ADMIN_SELECT =
  "id, user_id, service_type, status, created_at, payment_proof_url";

function customerName(names: Map<string, string>, userId: string): string {
  return names.get(userId) ?? DEFAULT_CUSTOMER_NAME;
}

function buildJastipOrder(
  row: JastipRow,
  names: Map<string, string>,
  now: Date,
): AdminOrder {
  return {
    id: row.id,
    service: "jastip",
    customerName: customerName(names, row.user_id),
    detail: `${row.item_name} → ${row.dropoff_location}`,
    amount: row.delivery_tip,
    amountLabel: `Ongkir ${formatRupiah(row.delivery_tip)}`,
    status: row.status,
    paymentProofUrl: row.payment_proof_url,
    createdAt: row.created_at,
    createdLabel: formatRelativeTime(row.created_at, now),
  };
}

function buildPrintOrder(
  row: PrintRow,
  names: Map<string, string>,
  now: Date,
): AdminOrder {
  const price = calculatePrintPrice(
    row.print_type,
    row.binding_type,
    row.total_pages,
  );

  return {
    id: row.id,
    service: "printing",
    customerName: customerName(names, row.user_id),
    detail: `${row.total_pages} hlm · ${getPrintTypeLabel(row.print_type)} · Jilid ${getBindingLabel(row.binding_type)}`,
    amount: price.total,
    amountLabel: `Estimasi ${formatRupiah(price.total)}`,
    status: row.status,
    paymentProofUrl: row.payment_proof_url,
    createdAt: row.created_at,
    createdLabel: formatRelativeTime(row.created_at, now),
  };
}

function buildProjectOrder(
  row: ProjectRow,
  names: Map<string, string>,
  now: Date,
): AdminOrder {
  const stack = row.tech_stack?.length ? ` · ${row.tech_stack.join(", ")}` : "";

  return {
    id: row.id,
    service: "projects",
    customerName: customerName(names, row.client_id),
    detail: `${row.title}${stack}`,
    amount: row.budget,
    amountLabel: `Budget ${formatRupiah(row.budget)}`,
    status: row.status,
    paymentProofUrl: row.payment_proof_url,
    createdAt: row.created_at,
    createdLabel: formatRelativeTime(row.created_at, now),
  };
}

function buildTutoringOrder(
  row: TutoringRow,
  names: Map<string, string>,
  now: Date,
): AdminOrder {
  return {
    id: row.id,
    service: "tutoring",
    customerName: customerName(names, row.student_id),
    detail: row.subject,
    amount: row.price,
    amountLabel: `Tarif ${formatRupiah(row.price)}`,
    status: row.status,
    paymentProofUrl: row.payment_proof_url,
    createdAt: row.created_at,
    createdLabel: formatRelativeTime(row.created_at, now),
  };
}

function buildAcademicOrder(
  row: AcademicRow,
  names: Map<string, string>,
  now: Date,
): AdminOrder {
  return {
    id: row.id,
    service: "academic",
    customerName: customerName(names, row.user_id),
    detail: getAcademicServiceTypeMeta(row.service_type).label,
    amount: null,
    amountLabel: null,
    status: row.status,
    paymentProofUrl: row.payment_proof_url,
    createdAt: row.created_at,
    createdLabel: formatRelativeTime(row.created_at, now),
  };
}

/** Mengambil nama lengkap pemesan dari `public.profiles` untuk sekumpulan id. */
async function fetchCustomerNames(
  supabase: SupabaseServerClient,
  userIds: string[],
): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(userIds)];
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", uniqueIds);

  if (error || !data) {
    return new Map();
  }

  const rows = data as ProfileRow[];
  return new Map(
    rows.map((row) => [row.id, row.full_name ?? DEFAULT_CUSTOMER_NAME]),
  );
}

/**
 * Menghitung kartu overview operator dari daftar pesanan ternormalisasi.
 * Fungsi murni agar mudah diuji & dipakai ulang.
 */
export function buildAdminOverview(orders: AdminOrder[]): AdminOverview {
  let needsAction = 0;
  let revenue = 0;

  for (const order of orders) {
    if (ADMIN_ACTION_STATUSES.includes(order.status)) {
      needsAction += 1;
    }

    if (ADMIN_REVENUE_STATUSES.includes(order.status) && order.amount !== null) {
      revenue += order.amount;
    }
  }

  return {
    totalOrders: orders.length,
    needsAction,
    revenue,
    revenueLabel: formatRupiah(revenue),
  };
}

/** Memastikan tiap baris terisi walau kueri Supabase gagal (data tak terlihat). */
function rowsOf<T>(result: { data: unknown; error: unknown }): T[] {
  return (result.error ? [] : (result.data as T[] | null)) ?? [];
}

/**
 * Read-model seluruh pesanan lintas 5 layanan untuk dashboard operator `/admin`.
 * RLS Supabase membatasi baris yang terlihat; halaman ini mengandalkan policy
 * operator di database agar dapat membaca seluruh pesanan.
 */
export async function fetchAdminOrders(): Promise<AdminOrdersPayload> {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return { orders: [], overview: buildAdminOverview([]) };
  }

  const [jastip, printing, projects, tutoring, academic] = await Promise.all([
    supabase
      .from("jastip_orders")
      .select(JASTIP_ADMIN_SELECT)
      .order("created_at", { ascending: false }),
    supabase
      .from("print_orders")
      .select(PRINT_ADMIN_SELECT)
      .order("created_at", { ascending: false }),
    supabase
      .from("coding_projects")
      .select(PROJECT_ADMIN_SELECT)
      .order("created_at", { ascending: false }),
    supabase
      .from("tutoring_sessions")
      .select(TUTORING_ADMIN_SELECT)
      .order("created_at", { ascending: false }),
    supabase
      .from("academic_services")
      .select(ACADEMIC_ADMIN_SELECT)
      .order("created_at", { ascending: false }),
  ]);

  const jastipRows = rowsOf<JastipRow>(jastip);
  const printRows = rowsOf<PrintRow>(printing);
  const projectRows = rowsOf<ProjectRow>(projects);
  const tutoringRows = rowsOf<TutoringRow>(tutoring);
  const academicRows = rowsOf<AcademicRow>(academic);

  const names = await fetchCustomerNames(supabase, [
    ...jastipRows.map((row) => row.user_id),
    ...printRows.map((row) => row.user_id),
    ...projectRows.map((row) => row.client_id),
    ...tutoringRows.map((row) => row.student_id),
    ...academicRows.map((row) => row.user_id),
  ]);

  const now = new Date();
  const orders: AdminOrder[] = [
    ...jastipRows.map((row) => buildJastipOrder(row, names, now)),
    ...printRows.map((row) => buildPrintOrder(row, names, now)),
    ...projectRows.map((row) => buildProjectOrder(row, names, now)),
    ...tutoringRows.map((row) => buildTutoringOrder(row, names, now)),
    ...academicRows.map((row) => buildAcademicOrder(row, names, now)),
  ];

  orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return { orders, overview: buildAdminOverview(orders) };
}
