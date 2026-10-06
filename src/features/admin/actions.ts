"use server";

import { revalidatePath } from "next/cache";
import { JASTIP_PAID_STATUS } from "@/features/jastip/types";
import type { OrderService, OrderStatus } from "@/features/orders/types";
import { getOrderStatusMeta } from "@/features/orders/status";
import { fetchProfileRole } from "@/features/profile/queries";
import {
  PAID_ORDER_STATUS,
  PENDING_VERIFICATION_STATUS,
} from "@/features/payment/constants";
import { mapDatabaseError } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  confirmOrderPaymentSchema,
  deleteAdminOrderSchema,
  updateAdminOrderStatusSchema,
} from "./schemas";
import {
  ADMIN_DELETABLE_STATUSES,
  type AdminOperatorStatus,
} from "./status";
import type { AdminActionResult } from "./types";

type SupabaseServerClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;

const ADMIN_PATH = "/admin";
const ORDERS_PATH = "/orders";

/** Route customer-facing tiap layanan yang perlu di-refresh setelah update. */
const SERVICE_PATHS: Record<OrderService, string> = {
  jastip: "/jastip",
  printing: "/printing",
  projects: "/projects",
  tutoring: "/tutoring",
  academic: "/academic",
};

/** Status "lunas" per layanan setelah operator memverifikasi bukti transfer. */
const PAID_STATUS_BY_SERVICE: Record<OrderService, string> = {
  jastip: JASTIP_PAID_STATUS,
  printing: PAID_ORDER_STATUS,
  projects: PAID_ORDER_STATUS,
  tutoring: PAID_ORDER_STATUS,
  academic: PAID_ORDER_STATUS,
};

const SESSION_EXPIRED: AdminActionResult = {
  status: "error",
  message: "Sesi berakhir. Silakan login kembali.",
};

/** Nama tabel Supabase tiap layanan — dipakai operasi baca & hapus baris. */
const SERVICE_TABLES: Record<OrderService, string> = {
  jastip: "jastip_orders",
  printing: "print_orders",
  projects: "coding_projects",
  tutoring: "tutoring_sessions",
  academic: "academic_services",
};

const FORBIDDEN: AdminActionResult = {
  status: "error",
  message: "Anda tidak memiliki akses operator.",
};

/**
 * Menulis status baru ke tabel layanan yang sesuai. Operator Campify bekerja
 * sebagai penyedia layanan langsung sehingga tidak dibatasi kepemilikan pada
 * filter kueri — isolasi data tetap dijaga oleh RLS Supabase di database.
 *
 * Update tidak memfilter status asal, sehingga pesanan berstatus `PAID`
 * (lunas QRIS) dapat dilanjutkan operator ke `in_progress` lalu `completed`.
 * Status target yang diizinkan dibatasi `ADMIN_OPERATOR_STATUSES`
 * (`in_progress` | `completed` | `cancelled`) melalui `updateAdminOrderStatusSchema`.
 */
function updateOrderStatus(
  supabase: SupabaseServerClient,
  service: OrderService,
  orderId: string,
  status: AdminOperatorStatus,
) {
  switch (service) {
    case "jastip":
      return supabase
        .from("jastip_orders")
        .update({ status })
        .eq("id", orderId)
        .select("id");
    case "printing":
      return supabase
        .from("print_orders")
        .update({ status })
        .eq("id", orderId)
        .select("id");
    case "projects":
      return supabase
        .from("coding_projects")
        .update({ status })
        .eq("id", orderId)
        .select("id");
    case "tutoring":
      return supabase
        .from("tutoring_sessions")
        .update({ status })
        .eq("id", orderId)
        .select("id");
    case "academic":
      return supabase
        .from("academic_services")
        .update({ status })
        .eq("id", orderId)
        .select("id");
  }
}

/**
 * Pembaruan status pesanan oleh operator Campify dari dashboard `/admin`.
 * Me-refresh halaman admin sekaligus seluruh route customer-facing terkait agar
 * perubahan langsung terlihat oleh pemesan.
 */
export async function updateAdminOrderStatusAction(input: {
  service: OrderService;
  orderId: string;
  status: AdminOperatorStatus;
}): Promise<AdminActionResult> {
  const parsed = updateAdminOrderStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "Permintaan pembaruan status tidak valid." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return SESSION_EXPIRED;
  }

  // Defense-in-depth: Server Action dapat dipanggil langsung tanpa melewati
  // guard halaman `/admin`, sehingga peran diverifikasi ulang di sini.
  const role = await fetchProfileRole(data.user.id);
  if (role !== "admin") {
    return FORBIDDEN;
  }

  const result = await updateOrderStatus(
    supabase,
    parsed.data.service,
    parsed.data.orderId,
    parsed.data.status,
  );

  if (result.error) {
    return {
      status: "error",
      message: mapDatabaseError(
        result.error.message,
        "Gagal memperbarui status pesanan. Silakan coba lagi.",
      ),
    };
  }

  if (!result.data || result.data.length === 0) {
    return {
      status: "error",
      message:
        "Pesanan tidak ditemukan atau Anda tidak memiliki izin memperbaruinya.",
    };
  }

  revalidatePath(ADMIN_PATH);
  revalidatePath(ORDERS_PATH);
  revalidatePath(`${ORDERS_PATH}/${parsed.data.orderId}`);
  revalidatePath(SERVICE_PATHS[parsed.data.service]);

  return {
    status: "success",
    message: `Status diperbarui ke "${getOrderStatusMeta(parsed.data.status).label}".`,
  };
}

/**
 * Menandai pembayaran manual QRIS sebagai lunas: memindahkan pesanan dari
 * `PENDING_VERIFICATION` ke status "dibayar" (`PAID`, atau `accepted` untuk
 * Jastip). Hanya berlaku bila status saat ini benar-benar menunggu verifikasi.
 */
function confirmPayment(
  supabase: SupabaseServerClient,
  service: OrderService,
  orderId: string,
) {
  const status = PAID_STATUS_BY_SERVICE[service];

  switch (service) {
    case "jastip":
      return supabase
        .from("jastip_orders")
        .update({ status })
        .eq("id", orderId)
        .eq("status", PENDING_VERIFICATION_STATUS)
        .select("id");
    case "printing":
      return supabase
        .from("print_orders")
        .update({ status })
        .eq("id", orderId)
        .eq("status", PENDING_VERIFICATION_STATUS)
        .select("id");
    case "projects":
      return supabase
        .from("coding_projects")
        .update({ status })
        .eq("id", orderId)
        .eq("status", PENDING_VERIFICATION_STATUS)
        .select("id");
    case "tutoring":
      return supabase
        .from("tutoring_sessions")
        .update({ status })
        .eq("id", orderId)
        .eq("status", PENDING_VERIFICATION_STATUS)
        .select("id");
    case "academic":
      return supabase
        .from("academic_services")
        .update({ status })
        .eq("id", orderId)
        .eq("status", PENDING_VERIFICATION_STATUS)
        .select("id");
  }
}

/**
 * Konfirmasi pembayaran manual oleh operator: memverifikasi bukti transfer lalu
 * menandai pesanan lunas agar dapat dilanjutkan ke `in_progress` → `completed`.
 */
export async function confirmOrderPaymentAction(input: {
  service: OrderService;
  orderId: string;
}): Promise<AdminActionResult> {
  const parsed = confirmOrderPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "Permintaan konfirmasi tidak valid." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return SESSION_EXPIRED;
  }

  const role = await fetchProfileRole(data.user.id);
  if (role !== "admin") {
    return FORBIDDEN;
  }

  const result = await confirmPayment(
    supabase,
    parsed.data.service,
    parsed.data.orderId,
  );

  if (result.error) {
    return {
      status: "error",
      message: mapDatabaseError(
        result.error.message,
        "Gagal mengonfirmasi pembayaran. Silakan coba lagi.",
      ),
    };
  }

  if (!result.data || result.data.length === 0) {
    return {
      status: "error",
      message: "Pesanan tidak ditemukan atau belum menunggu verifikasi.",
    };
  }

  revalidatePath(ADMIN_PATH);
  revalidatePath(ORDERS_PATH);
  revalidatePath(`${ORDERS_PATH}/${parsed.data.orderId}`);
  revalidatePath(SERVICE_PATHS[parsed.data.service]);

  return {
    status: "success",
    message: "Pembayaran dikonfirmasi! Status pesanan kini Lunas.",
  };
}

/**
 * Penghapusan permanen baris pesanan oleh operator Campify.
 *
 * Status asal tidak pernah dipercaya dari client: dibaca ulang dari database
 * dan wajib termasuk `ADMIN_DELETABLE_STATUSES` (`completed` / `cancelled`)
 * agar pesanan yang masih berjalan tidak dapat dihapus. Filter status juga
 * diterapkan langsung pada perintah `DELETE`, sehingga validasi tetap berlaku
 * walau baris berubah status di antara kedua query (TOCTOU).
 */
export async function deleteOrderAction(input: {
  service: OrderService;
  orderId: string;
}): Promise<AdminActionResult> {
  const parsed = deleteAdminOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "Permintaan penghapusan tidak valid." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return SESSION_EXPIRED;
  }

  // Defense-in-depth: Server Action dapat dipanggil langsung tanpa melewati
  // guard halaman `/admin`, sehingga peran diverifikasi ulang di sini.
  const role = await fetchProfileRole(data.user.id);
  if (role !== "admin") {
    return FORBIDDEN;
  }

  const { service, orderId } = parsed.data;
  const table = SERVICE_TABLES[service];

  // Baca status terkini agar pesan penolakan dapat menyebabkan alasan yang
  // jelas (status apa yang menghalangi penghapusan).
  const current = await supabase
    .from(table)
    .select("status")
    .eq("id", orderId)
    .maybeSingle();

  if (current.error) {
    return {
      status: "error",
      message: mapDatabaseError(
        current.error.message,
        "Gagal memeriksa pesanan. Silakan coba lagi.",
      ),
    };
  }

  const currentRow = current.data as { status: OrderStatus } | null;
  if (!currentRow) {
    return { status: "error", message: "Pesanan tidak ditemukan." };
  }

  if (!ADMIN_DELETABLE_STATUSES.includes(currentRow.status)) {
    return {
      status: "error",
      message:
        "Hanya pesanan berstatus Selesai atau Dibatalkan yang dapat dihapus.",
    };
  }

  const deleted = await supabase
    .from(table)
    .delete()
    .eq("id", orderId)
    .in("status", [...ADMIN_DELETABLE_STATUSES])
    .select("id");

  if (deleted.error) {
    return {
      status: "error",
      message: mapDatabaseError(
        deleted.error.message,
        "Gagal menghapus pesanan. Silakan coba lagi.",
      ),
    };
  }

  const deletedRows = deleted.data as { id: string }[] | null;
  if (!deletedRows || deletedRows.length === 0) {
    return {
      status: "error",
      message: "Pesanan gagal dihapus karena statusnya baru saja berubah.",
    };
  }

  revalidatePath(ADMIN_PATH);
  revalidatePath(ORDERS_PATH);
  revalidatePath(`${ORDERS_PATH}/${orderId}`);
  revalidatePath(SERVICE_PATHS[service]);

  return {
    status: "success",
    message: "Pesanan berhasil dihapus permanen.",
  };
}
