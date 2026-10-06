"use server";

import { revalidatePath } from "next/cache";
import { fetchProfileRole } from "@/features/profile/queries";
import { mapDatabaseError } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { upsertOrderTrackingSchema } from "./schemas";

const ADMIN_PATH = "/admin";
const ORDERS_PATH = "/orders";

const SESSION_EXPIRED = {
  status: "error",
  message: "Sesi berakhir. Silakan login kembali.",
} as const;

const FORBIDDEN = {
  status: "error",
  message: "Anda tidak memiliki akses operator.",
} as const;

const TABLE_BY_SERVICE = {
  jastip: "jastip_orders",
  printing: "print_orders",
  projects: "coding_projects",
  tutoring: "tutoring_sessions",
  academic: "academic_services",
} as const;

type TrackingActionResult = {
  status: "success" | "error";
  message: string;
};

/**
 * Menyimpan posisi kurir/operator terakhir untuk satu pesanan (upsert).
 *
 * Hanya operator yang boleh menulis (RLS `tracking_insert/update` membatasi
 * `is_admin()`) — pemesan murni menerima posisi lewat kanal Realtime.
 * Posisi di-upsert per `(order_id, service)` sehingga tabel tidak tumbuh
 * tanpa batas.
 */
export async function upsertOrderTrackingAction(input: {
  service: string;
  orderId: string;
  lat: number;
  lng: number;
  note?: string;
}): Promise<TrackingActionResult> {
  const parsed = upsertOrderTrackingSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "Posisi tidak valid." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return SESSION_EXPIRED;
  }

  // Guard peran diverifikasi ulang: Server Action dapat dipanggil langsung.
  const role = await fetchProfileRole(data.user.id);
  if (role !== "admin") {
    return FORBIDDEN;
  }

  const { service, orderId, lat, lng, note } = parsed.data;

  // Pesanan wajib ada — menolak posisi untuk id acak (mencegah spam baris).
  const order = await supabase
    .from(TABLE_BY_SERVICE[service])
    .select("id")
    .eq("id", orderId)
    .maybeSingle();

  if (order.error) {
    return {
      status: "error",
      message: mapDatabaseError(order.error.message, "Gagal memeriksa pesanan."),
    };
  }

  if (!order.data) {
    return { status: "error", message: "Pesanan tidak ditemukan." };
  }

  const { error: upsertError } = await supabase
    .from("order_trackings")
    .upsert(
      {
        order_id: orderId,
        service,
        lat,
        lng,
        note: note ?? null,
        updated_by: data.user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "order_id,service" },
    );

  if (upsertError) {
    return {
      status: "error",
      message: mapDatabaseError(
        upsertError.message,
        "Gagal memperbarui posisi. Silakan coba lagi.",
      ),
    };
  }

  revalidatePath(ADMIN_PATH);
  revalidatePath(ORDERS_PATH);
  revalidatePath(`${ORDERS_PATH}/${orderId}`);

  return { status: "success", message: "Posisi kurir diperbarui." };
}
