import { formatRelativeTime } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeStoredNotification } from "./status-copy";
import type { AppNotification } from "./types";

/** Satu baris dari tabel `public.notifications`. */
export interface StoredNotification extends AppNotification {
  orderId: string | null;
  read: boolean;
}

const NOTIFICATION_SELECT =
  "id, service, order_id, title, body, read, created_at";

const NOTIFICATION_LIMIT = 50;

interface NotificationRow {
  id: string;
  service: string | null;
  order_id: string | null;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

/**
 * Notifikasi tersimpan milik user login (terbaru dulu).
 * Mengembalikan `[]` bila sesi berakhir / kueri gagal — halaman tetap aman
 * dan jatuh ke feed derived dari pesanan.
 */
export async function fetchStoredNotifications(): Promise<
  StoredNotification[]
> {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return [];
  }

  const { data, error } = await supabase
    .from("notifications")
    .select(NOTIFICATION_SELECT)
    .eq("user_id", authData.user.id)
    .order("created_at", { ascending: false })
    .limit(NOTIFICATION_LIMIT);

  if (error || !data) {
    return [];
  }

  const now = new Date();

  return (data as NotificationRow[]).map((row) => {
    // Fallback untuk notifikasi LAMA yang masih memuat judul generik
    // "Status pesanan diperbarui" + body mentah ("Pesanan kini berstatus
    // in progress"). Ditulis ulang saat tampilan; baris di database tidak
    // diubah sehingga notifikasi chat/verifikasi tetap apa adanya.
    const copy = normalizeStoredNotification(row.title, row.body, "info");

    return {
      id: row.id,
      service: row.service as AppNotification["service"],
      orderId: row.order_id,
      title: copy.title,
      body: copy.body,
      tone: copy.tone,
      read: row.read,
      createdLabel: formatRelativeTime(row.created_at, now),
    };
  });
}

/**
 * Jumlah notifikasi belum dibaca untuk badge lonceng.
 * `count: "exact"` + `head: true` agar Supabase hanya mengembalikan angka.
 */
export async function fetchUnreadNotificationCount(): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return 0;
  }

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", authData.user.id)
    .eq("read", false);

  if (error) {
    return 0;
  }

  return count ?? 0;
}
