-- =============================================================================
-- Campify — Izin HAPUS baris milik sendiri (untuk fitur "Hapus Semua")
-- =============================================================================
-- KEBUTUHAN
--   Fitur "Hapus Semua" pada `/inbox` menjalankan
--   `clearAllNotificationsAction()` (hapus `notifications`) dan
--   `clearAllMessagesAction()` (hapus `chat_messages` milik sendiri).
--   Kedua tabel sebelumnya HANYA punya policy select/insert/update — sehingga
--   `delete` akan selalu ditolak RLS (42501) dan fitur tidak bisa bekerja.
--
-- JAMINAN KEAMANAN (sesuai guardrail: TIDAK mengubah skema yang sudah ada)
--   - TIDAK menambah/mengubah kolom, tabel, index, enum, atau trigger.
--   - TIDAK menyentuh policy lama (select/insert/update) — hanya MENAMBAH dua
--     policy delete baru.
--   - Sangat sempit: HANYA baris milik user yang sedang login.
--       `notification_delete` → `user_id = auth.uid()`
--       `chat_message_delete` → `sender_id = auth.uid()` (pesan lawan bicara
--         TIDAK bisa dihapus oleh user lain, bahkan oleh admin).
--   - Idempoten (`drop policy if exists` + `create policy`).
--
-- CARA PAKAI: Supabase Dashboard → SQL Editor → tempel → Run.
-- =============================================================================

drop policy if exists "notification_delete" on public.notifications;
create policy "notification_delete" on public.notifications
  for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "chat_message_delete" on public.chat_messages;
create policy "chat_message_delete" on public.chat_messages
  for delete to authenticated
  using (sender_id = auth.uid());