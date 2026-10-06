import {
  ORDER_SERVICES,
  ORDER_STATUSES,
  type OrderService,
  type OrderStatus,
} from "@/features/orders/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicTrackOrderSchema } from "./schemas";
import type { PublicOrderTracking } from "./types";

/** Baris mentah hasil RPC `public.track_order` (semua kolom nullable). */
interface TrackOrderRow {
  service: string | null;
  status: string | null;
  reference: string | null;
  created_at: string | null;
  location_updated_at: string | null;
}

function isOrderService(value: string): value is OrderService {
  return (ORDER_SERVICES as readonly string[]).includes(value);
}

function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

/**
 * Membaca status publik satu pesanan lewat RPC `public.track_order`.
 *
 * Alur: input bebas (ID polos atau tautan) → dinormalkan & divalidasi Zod →
 * UUID (yang berlaku sebagai *capability token*) dikirim ke fungsi
 * `security definer`. RLS tabel layanan bersifat ketat, sehingga anon memang
 * tidak bisa membaca langsung; semua pembacaan terjadi di dalam fungsi dan
 * hanya kolom aman-publik yang dikembalikan.
 *
 * Tidak pernah throw: input tidak valid, pesanan tidak ada, maupun kegagalan
 * jaringan sama-sama menghasilkan `null` agar halaman dapat menampilkan
 * empty-state alih-alih error 500.
 */
export async function fetchPublicOrderTracking(
  rawOrderId: string,
): Promise<PublicOrderTracking | null> {
  const parsed = publicTrackOrderSchema.safeParse({ orderId: rawOrderId });
  if (!parsed.success) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("track_order", {
    p_order_id: parsed.data.orderId,
  });

  if (error) {
    return null;
  }

  const row = (data as TrackOrderRow[] | null)?.at(0);
  if (!row?.service || !isOrderService(row.service)) {
    return null;
  }
  if (!row.status || !isOrderStatus(row.status) || !row.created_at) {
    return null;
  }

  return {
    service: row.service,
    status: row.status,
    reference: row.reference,
    createdAt: row.created_at,
    locationUpdatedAt: row.location_updated_at,
  };
}
