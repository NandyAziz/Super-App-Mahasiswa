-- =============================================================================
-- Campify — Backfill profil agar operator tidak tertolak RLS saat kirim chat
-- =============================================================================
-- GEJALA
--   Operator tidak bisa mengirim pesan dari panel `/admin` (chat pelanggan),
--   sementara pelanggan bisa. Log server berbunyi:
--     [Admin Chat] INSERT gagal: { code: "42501", ... }
--   atau (bila guard menolak lebih dulu):
--     code: "GUARD_PARTICIPANT".
--
-- PENYEBAB
--   Kebijakan `chat_insert` mensyaratkan:
--     sender_id = auth.uid() and (public.is_admin() or is_order_participant(...))
--   `sender_id` selalu diisi dari sesi login sehingga selalu benar. Namun
--   `public.is_admin()` bernilai true HANYA bila ada baris `public.profiles`
--   dengan `role = 'admin'` untuk `auth.uid()`. Akun yang dibuat manual/import
--   (atau signup sebelum migrasi 20261001000000 dijalankan) TIDAK memiliki baris
--   profil, sehingga `is_admin()` -> false. Operator juga bukan pemilik pesanan,
--   jadi `is_order_participant()` -> false. INSERT ditolak RLS (42501).
--
-- CATATAN PENTING
--   Aplikasi TIDAK pernah mengirim `sender_id` dari klien, dan tabel
--   `chat_messages.sender_id` tetap `references auth.users (id)`. Jadi akun
--   yang benar-benar tidak ada di `auth.users` (42503 foreign key) tetap akan
--   gagal — itu memang benar dan tidak boleh dilonggarkan.
--
-- JAMINAN KEAMANAN
--   - TIDAK mengubah skema utama, struktur RLS, atau menghapus tabel apa pun.
--   - TIDAK menyentuh trigger pada `jastip_orders`, `print_orders`, dll.
--   - Backfill memakai nilai default yang SAMA dengan trigger signup
--     (`role = 'user'`), jadi tidak ada akun yang otomatis naik jadi operator.
--     Pemberian operator tetap keputusan manual (lihat bagian 3).
--   - Idempoten (aman dijalankan berulang).
--
-- CARA PAKAI: Supabase Dashboard → SQL Editor → tempel → Run.
-- =============================================================================

-- 1. Pastikan kolom & default profil lengkap (idempoten, tanpa mengubah data)
do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'profiles'
  ) then
    raise notice 'Tabel public.profiles tidak ada — jalankan 20261001000000_fix_profiles_signup.sql lebih dulu.';
    return;
  end if;
end $$;

alter table public.profiles add column if not exists role text default 'user';
alter table public.profiles alter column role set default 'user';

-- 2. Backfill profil untuk user yang belum memilikinya -----------------------
-- Nilai mengikuti trigger `handle_new_user` (full_name/university dari metadata,
-- role = 'user' — BUKAN 'admin').
insert into public.profiles (id, full_name, university, role, created_at, updated_at)
select
  u.id,
  coalesce(nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''), 'Mahasiswa'),
  coalesce(nullif(trim(u.raw_user_meta_data ->> 'university'), ''), 'Kampus'),
  'user',
  coalesce(u.created_at, now()),
  now()
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

-- 3. Naikkan operator yang memang SHOULD BERHAK menjadi admin ----------------
-- ⚠️ GANTI UUID DI BAWAH dengan id akun operator Anda (Dashboard → Authentication
--    → Users), lalu HAPUS blok ini bila tidak ingin ada operator yang otomatis
--    mendapat hak admin.
--
-- update public.profiles set role = 'admin' where id = 'GANTI-DENGAN-UUID-OPERATOR';

-- 4. Laporan diagnosis (aman, tidak mengubah data) ---------------------------
-- Menampilkan user yang login ke aplikasi tapi TIDAK punya baris profil, dan
-- profil yang role-nya bukan 'admin' — dua penyebab khas kegagalan chat admin.
select
  u.id,
  u.email,
  coalesce(p.role::text, '<no profile row>') as role,
  case
    when p.id is null then 'INSERT chat akan ditolak RLS (42501)'
    when p.role <> 'admin' then 'boleh chat hanya bila pemilik/partner pesanan'
    else 'operator — is_admin() = true'
  end as diagnosis
from auth.users u
left join public.profiles p on p.id = u.id
order by p.role nulls first, u.email;