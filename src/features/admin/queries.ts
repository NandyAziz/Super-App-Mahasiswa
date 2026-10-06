import { getAcademicServiceTypeMeta } from "@/features/academic/service-types";
import type { AcademicServiceType } from "@/features/academic/types";
import { parseAcademicNotes } from "@/features/academic/request-types";
import type { OrderStatus } from "@/features/orders/types";
import { formatRelativeTime, formatRupiah, getUrlLabel } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ADMIN_ACTION_STATUSES, ADMIN_REVENUE_STATUSES } from "./status";
import {
  extractProjectAttachment,
  extractProjectDeadline,
  extractWhatsAppNumber,
} from "./contact";
import type { AdminOrder, AdminOrderDocument, AdminOrdersPayload, AdminOverview } from "./types";

type SupabaseServerClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;

interface JastipRow {
  id: string;
  user_id: string;
  item_name: string;
  pickup_location: string | null;
  dropoff_location: string;
  delivery_tip: number;
  status: OrderStatus;
  created_at: string;
  payment_proof_url: string | null;
  destination_lat: number | null;
  destination_lng: number | null;
}

interface PrintRow {
  id: string;
  user_id: string;
  document_url: string;
  copies: number;
  contact_whatsapp: string | null;
  delivery_location: string | null;
  custom_note: string | null;
  delivery_fee: number;
  status: OrderStatus;
  created_at: string;
  payment_proof_url: string | null;
  destination_lat: number | null;
  destination_lng: number | null;
}

interface ProjectRow {
  id: string;
  client_id: string;
  title: string;
  description: string;
  budget: number;
  status: OrderStatus;
  created_at: string;
  payment_proof_url: string | null;
  destination_lat: number | null;
  destination_lng: number | null;
}

interface TutoringRow {
  id: string;
  student_id: string;
  subject: string;
  scheduled_at: string;
  price: number;
  status: OrderStatus;
  created_at: string;
  payment_proof_url: string | null;
  destination_lat: number | null;
  destination_lng: number | null;
}

interface AcademicRow {
  id: string;
  user_id: string;
  service_type: AcademicServiceType;
  document_url: string | null;
  notes: string | null;
  status: OrderStatus;
  created_at: string;
  payment_proof_url: string | null;
  destination_lat: number | null;
  destination_lng: number | null;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
}

const DEFAULT_CUSTOMER_NAME = "Mahasiswa";

/** Kolom ringkas tiap tabel layanan untuk read-model tabel operator. */
const DESTINATION_COLUMNS = "destination_lat, destination_lng";

const JASTIP_ADMIN_SELECT =
  "id, user_id, item_name, pickup_location, dropoff_location, delivery_tip, status, created_at, payment_proof_url, " +
  DESTINATION_COLUMNS;
const PRINT_ADMIN_SELECT =
  "id, user_id, document_url, copies, contact_whatsapp, delivery_location, custom_note, delivery_fee, status, created_at, payment_proof_url, " +
  DESTINATION_COLUMNS;
const PROJECT_ADMIN_SELECT =
  "id, client_id, title, description, budget, status, created_at, payment_proof_url, " +
  DESTINATION_COLUMNS;
const TUTORING_ADMIN_SELECT =
  "id, student_id, subject, scheduled_at, price, status, created_at, payment_proof_url, " +
  DESTINATION_COLUMNS;
const ACADEMIC_ADMIN_SELECT =
  "id, user_id, service_type, document_url, notes, status, created_at, payment_proof_url, " +
  DESTINATION_COLUMNS;

function customerName(names: Map<string, string>, userId: string): string {
  return names.get(userId) ?? DEFAULT_CUSTOMER_NAME;
}

/** Baris layanan yang membawa koordinat tujuan (semua tabel punya kolom ini). */
interface DestinationRow {
  destination_lat: number | null;
  destination_lng: number | null;
}

/** Koordinat tujuan hanya diteruskan bila KEDUA-nya ada & sah (WGS84). */
function toDestination(row: DestinationRow): Pick<
  AdminOrder,
  "destinationLat" | "destinationLng"
> {
  const lat = row.destination_lat;
  const lng = row.destination_lng;

  if (lat === null || lng === null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { destinationLat: null, destinationLng: null };
  }

  return { destinationLat: lat, destinationLng: lng };
}

function buildJastipOrder(
  row: JastipRow,
  names: Map<string, string>,
  now: Date,
): AdminOrder {
  const contactPhone = extractWhatsAppNumber(row.pickup_location);

  return {
    id: row.id,
    service: "jastip",
    customerName: customerName(names, row.user_id),
    contactPhone,
    address: row.dropoff_location,
    specification: row.item_name,
    detail: `${row.item_name} → ${row.dropoff_location}`,
    amount: row.delivery_tip,
    amountLabel: `Ongkir ${formatRupiah(row.delivery_tip)}`,
    status: row.status,
    paymentProofUrl: row.payment_proof_url,
    documentUrl: null,
    documents: [],
    ...toDestination(row),
    createdAt: row.created_at,
    createdLabel: formatRelativeTime(row.created_at, now),
  };
}

function buildPrintOrder(
  row: PrintRow,
  names: Map<string, string>,
  now: Date,
): AdminOrder {
  // Berkas yang harus dicetak — dibuka/diunduh operator lewat
  // file chip "📎 Lihat Dokumen Pelanggan" di `/admin`.
  const documents: AdminOrderDocument[] = [
    {
      label: getUrlLabel(row.document_url),
      url: row.document_url,
      kind: "document",
    },
  ];

  return {
    id: row.id,
    service: "printing",
    customerName: customerName(names, row.user_id),
    contactPhone: row.contact_whatsapp?.trim() || null,
    address: row.delivery_location,
    specification: `${row.copies} salinan${row.custom_note ? ` · ${row.custom_note}` : ""}`,
    detail: `${row.copies} salinan · ${row.delivery_location ?? "Lokasi belum diisi"}`,
    // Ongkir ditagihkan di muka; biaya cetaknya sendiri dikonfirmasi mitra via
    // WhatsApp (bukan estimasi otomatis) sehingga tidak ikut dihitung. Baris
    // lama bernilai 0 dan sengaja tidak ditagihkan.
    amount:
      row.delivery_fee > 0 ? row.delivery_fee : null,
    amountLabel:
      row.delivery_fee > 0 ? `Ongkir ${formatRupiah(row.delivery_fee)}` : null,
    status: row.status,
    paymentProofUrl: row.payment_proof_url,
    documentUrl: row.document_url,
    documents,
    ...toDestination(row),
    createdAt: row.created_at,
    createdLabel: formatRelativeTime(row.created_at, now),
  };
}

function buildProjectOrder(
  row: ProjectRow,
  names: Map<string, string>,
  now: Date,
): AdminOrder {
  const deadline = extractProjectDeadline(row.description);
  const attachmentUrl = extractProjectAttachment(row.description);
  const documents: AdminOrderDocument[] = attachmentUrl
    ? [{ label: getUrlLabel(attachmentUrl), url: attachmentUrl, kind: "attachment" }]
    : [];

  return {
    id: row.id,
    service: "projects",
    customerName: customerName(names, row.client_id),
    contactPhone: extractWhatsAppNumber(row.description),
    address: null,
    specification: deadline ? `Deadline: ${deadline}` : null,
    detail: row.title,
    amount: row.budget,
    amountLabel: `Budget ${formatRupiah(row.budget)}`,
    status: row.status,
    paymentProofUrl: row.payment_proof_url,
    documentUrl: attachmentUrl,
    documents,
    ...toDestination(row),
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
    contactPhone: null,
    address: null,
    specification: row.scheduled_at ? `Jadwal: ${row.scheduled_at}` : null,
    detail: row.subject,
    amount: row.price,
    amountLabel: `Tarif ${formatRupiah(row.price)}`,
    status: row.status,
    paymentProofUrl: row.payment_proof_url,
    documentUrl: null,
    documents: [],
    ...toDestination(row),
    createdAt: row.created_at,
    createdLabel: formatRelativeTime(row.created_at, now),
  };
}

function buildAcademicOrder(
  row: AcademicRow,
  names: Map<string, string>,
  now: Date,
): AdminOrder {
  const parsed = parseAcademicNotes(row.notes);
  // Lampiran utama = `document_url` (draft); cadangan dari notes (rubrik dosen)
  // untuk baris yang menyimpan keduanya.
  const documents: AdminOrderDocument[] = [];

  if (row.document_url) {
    documents.push({
      label: getUrlLabel(row.document_url),
      url: row.document_url,
      kind: "document",
    });
  }

  if (parsed.rubricUrl && parsed.rubricUrl !== row.document_url) {
    documents.push({
      label: getUrlLabel(parsed.rubricUrl),
      url: parsed.rubricUrl,
      kind: "attachment",
    });
  }

  return {
    id: row.id,
    service: "academic",
    customerName: customerName(names, row.user_id),
    contactPhone: parsed.whatsapp || null,
    address: null,
    specification: parsed.instructions || getAcademicServiceTypeMeta(row.service_type).label,
    detail: getAcademicServiceTypeMeta(row.service_type).label,
    amount: null,
    amountLabel: null,
    status: row.status,
    paymentProofUrl: row.payment_proof_url,
    documentUrl: row.document_url,
    documents,
    ...toDestination(row),
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
