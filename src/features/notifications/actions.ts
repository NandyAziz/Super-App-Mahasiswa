"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const INBOX_PATH = "/inbox";

/**
 * Tandai seluruh notifikasi user login sebagai sudah dibaca.
 * Dipanggil sekali saat `/inbox` dibuka sehingga badge lonceng kembali 0.
 * RLS `notification_update` memaksa `user_id = auth.uid()` — tidak ada
 * notifikasi user lain yang bisa disentuh.
 */
export async function markAllNotificationsReadAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return;
  }

  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", data.user.id)
    .eq("read", false);

  revalidatePath(INBOX_PATH);
}

/**
 * Hapus seluruh notifikasi milik user login.
 *
 * Scope dijaga ketat oleh tiga lapis:
 *   1. `auth.getUser()` — tanpa sesi, aksi langsung berhenti.
 *   2. Filter `.eq("user_id", userId)` — hanya baris milik sendiri.
 *   3. RLS `notification_delete` (`user_id = auth.uid()`) — pengaman terakhir
 *      di database; notifikasi user lain mustahil terhapus.
 *
 * Mengembalikan jumlah baris terhapus agar UI bisa menampilkan toast akurat.
 */
export async function clearAllNotificationsAction(): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return 0;
  }

  const { data: deleted, error: deleteError } = await supabase
    .from("notifications")
    .delete()
    .eq("user_id", data.user.id)
    .select("id");

  if (deleteError) {
    console.error("[Notifications] Hapus semua gagal:", {
      code: deleteError.code,
      message: deleteError.message,
      details: deleteError.details,
      hint: deleteError.hint,
    });

    return -1;
  }

  const removed = deleted?.length ?? 0;
  revalidatePath(INBOX_PATH);

  return removed;
}

/**
 * Hapus seluruh pesan chat yang DIKIRIMKAN user login.
 *
 * Sengaja hanya pesan milik sendiri (`sender_id = auth.uid()`): pesan lawan
 * bicara adalah data miliknya dan tidak boleh hilang karena aksi ini.
 *
 * ⚠️ Berkas lampiran di Storage TIDAK ikut terhapus (object storage tidak
 * punya trigger delete di sini) — hanya baris pesannya yang dihapus.
 */
export async function clearAllMessagesAction(): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return 0;
  }

  const { data: deleted, error: deleteError } = await supabase
    .from("chat_messages")
    .delete()
    .eq("sender_id", data.user.id)
    .select("id");

  if (deleteError) {
    console.error("[Chat] Hapus semua pesan gagal:", {
      code: deleteError.code,
      message: deleteError.message,
      details: deleteError.details,
      hint: deleteError.hint,
    });

    return -1;
  }

  const removed = deleted?.length ?? 0;
  revalidatePath(INBOX_PATH);

  return removed;
}
