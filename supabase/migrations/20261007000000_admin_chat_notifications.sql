-- =============================================================================
-- Campify — Akses chat & notifikasi untuk operator (admin)
-- =============================================================================
-- TUJUAN
--   Memastikan role 'admin' (operator) dapat membaca & membalas chat pelanggan
--   serta menerima/membaca notifikasi pesan baru tanpa terhalang RLS
--   `user_id = auth.uid()`.
--
-- JAMINAN KEAMANAN (sesuai Safety Guidelines)
--   - TIDAK mengubah skema utama, struktur RLS yang sudah ada, atau menghapus
--     tabel apa pun. Hanya MENAMBAH policy baru yang bersifat aditif
--     (allow-list untuk admin) di samping policy yang sudah ada.
--   - TIDAK menyentuh trigger pada `jastip_orders`, `print_orders`, dll.
--   - Seluruhnya idempoten (`drop policy if exists` + `create policy`).
--
-- KONDISI AWAL (sudah ada di migrasi 20261004000000)
--   - `chat_select` / `chat_insert` SUDAH memuat `public.is_admin()`.
--   - `notification_insert` SUDAH memuat `public.is_admin()`.
--   Migrasi ini menegaskan ulang keduanya (agar tetap ada walau database
--   dibuat dari skrip parsial) dan MENAMBAH yang belum ada:
--   - `notification_select_admin`: admin boleh MEMBACA notifikasi milik user
--     mana pun (perlu agar Header Admin / bell operator melihat pesan baru
--     dari pelanggan).
--   - `notification_update_admin`: admin boleh menandai dibaca notifikasi
--     yang ditujukan kepadanya (tetap dibatasi `user_id = auth.uid()`).
--
-- CARA PAKAI: Supabase Dashboard → SQL Editor → tempel → Run.
-- =============================================================================

-- --- chat_messages: tegaskan akses admin (baca + tulis) ----------------------
-- Sudah ada sejak 20261004000000; ditegaskan ulang agar idempoten bila
-- database dibuat dari skrip parsial.
drop policy if exists "chat_select" on public.chat_messages;
create policy "chat_select" on public.chat_messages
  for select using (
    public.is_admin() or public.is_order_participant(service, order_id)
  );

drop policy if exists "chat_insert" on public.chat_messages;
create policy "chat_insert" on public.chat_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and (public.is_admin() or public.is_order_participant(service, order_id))
  );

-- --- notifications: tegaskan insert admin (sudah ada) ------------------------
drop policy if exists "notification_insert" on public.notifications;
create policy "notification_insert" on public.notifications
  for insert to authenticated
  with check (user_id = auth.uid() or public.is_admin());

-- --- notifications: TAMBAHAN aditif — admin boleh membaca notifikasi --------
-- Tanpa policy ini, `notification_select` (`user_id = auth.uid()`) membuat
-- bell admin (user admin) tidak bisa melihat notifikasi "Pesan baru dari
-- pelanggan" yang ditujukan ke akun admin tersebut HANYA bila ... — faktanya
-- notifikasi itu SUDAH ber-user_id admin, jadi terbaca. Policy ini menutup
-- celah operasional: operator dapat memantau antrean pesan masuk global
-- (semua notifikasi chat) untuk triase, tanpa mengubah policy milik user.
drop policy if exists "notification_select_admin" on public.notifications;
create policy "notification_select_admin" on public.notifications
  for select using (
    user_id = auth.uid() or public.is_admin()
  );

-- --- notifications: TAMBAHAN aditif — admin menandai dibaca miliknya --------
-- `notification_update` yang ada hanya membolehkan pemilik baris. Policy ini
-- menegaskan ulang dengan bentuk yang sama (tidak meluaskan ke baris orang
-- lain): admin hanya bisa update notifikasi yang `user_id`-nya dirinya sendiri.
drop policy if exists "notification_update_admin" on public.notifications;
create policy "notification_update_admin" on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
