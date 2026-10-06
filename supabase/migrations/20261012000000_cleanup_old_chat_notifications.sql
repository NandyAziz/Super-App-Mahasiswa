-- =============================================================================
-- Campify — Pembersihan otomatis data lama (chat & notifikasi)
-- =============================================================================
-- TUJUAN
--   Menghapus baris `notifications` & `chat_messages` yang sudah lebih dari
--   7 hari (created_at < NOW() - INTERVAL '7 days') agar tabel tidak tumbuh
--   tanpa batas dan query inbox/chat tetap ringan.
--
-- JAMINAN KEAMANAN (sesuai Safety Guidelines)
--   - TIDAK mengubah skema utama, struktur RLS, atau menghapus tabel/kolom.
--   - TIDAK menyentuh trigger pada `jastip_orders`, `print_orders`, dll.
--   - TIDAK menghapus tabel pesanan (jastip/print/projects/tutoring/academic).
--   - Hanya menambah 1 fungsi baru (CREATE OR REPLACE) + penjadwalan opsional.
--   - Idempoten: aman dijalankan berulang.
--
-- CATATAN PENTING
--   Hanya tabel `chat_messages` & `notifications` yang dibersihkan. Keduanya
--   tidak dirujuk foreign key dari tabel lain, jadi penghapusan aman. History
--   pesanan tetap utuh.
--
-- CARA PAKAI: Supabase Dashboard → SQL Editor → tempel → Run.
-- =============================================================================

-- 1. Fungsi pembersih ---------------------------------------------------------
-- Mengembalikan jumlah baris yang dihapus agar bisa diaudit dari log cron.
-- Retensi default 7 hari; ubah nilainya bila perlu (minimal 1 hari).
create or replace function public.cleanup_old_chat_and_notifications(
  p_retention_days integer default 7
)
returns table (
  deleted_chat_messages bigint,
  deleted_notifications bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cutoff timestamptz;
  v_chat bigint;
  v_notifications bigint;
begin
  v_cutoff := now() - (greatest(coalesce(p_retention_days, 7), 1) * interval '1 day');

  -- Jumlah baris harus diambil SAAT hapus (setelahnya predicate selalu 0).
  delete from public.chat_messages
  where created_at < v_cutoff;
  get diagnostics v_chat = row_count;

  delete from public.notifications
  where created_at < v_cutoff;
  get diagnostics v_notifications = row_count;

  return query select v_chat, v_notifications;
end;
$$;

comment on function public.cleanup_old_chat_and_notifications(integer) is
  'Menghapus chat_messages & notifications yang lebih lama dari N hari (default 7).';

-- 2. Penjadwalan otomatis (opsional, hanya bila pg_cron tersedia) ------------
-- Cron Supabase berjalan pada UTC, jadi '17 3 * * *' = 03:17 UTC = 10:17 WIB.
-- Bila ekstensi pg_cron tidak aktif, blok ini dilewati tanpa error — fungsi
-- tetap bisa dipanggil manual.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- Idempoten: hapus jadwal lama bila ada sebelum memasang yang baru.
    -- Dibungkus blok sendiri agar kegagalan unschedule TIDAK menggagalkan
    -- pemasangan jadwal baru.
    begin
      perform cron.unschedule('campify-cleanup-old-chat-notifications');
    exception when others then
      null;
    end;

    perform cron.schedule(
      'campify-cleanup-old-chat-notifications',
      '17 3 * * *',
      $cron$select public.cleanup_old_chat_and_notifications(7);$cron$
    );

    raise notice 'Jadwal pembersihan harian aktif (03:17 UTC / 10:17 WIB).';
  else
    raise notice
      'pg_cron tidak aktif — jalankan select public.cleanup_old_chat_and_notifications(7); secara manual bila perlu.';
  end if;
exception
  when undefined_table or insufficient_privilege or invalid_schema_name then
    raise notice 'Penjadwalan otomatis dilewati; fungsi pembersih tetap bisa dipanggil manual.';
end;
$$;

-- =============================================================================
-- 3. PEMBERSIHAN SEKARANG (opsional — hapus blok ini bila hanya ingin jadwal)
-- =============================================================================
-- select * from public.cleanup_old_chat_and_notifications(7);