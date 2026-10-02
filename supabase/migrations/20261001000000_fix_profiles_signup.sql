-- =============================================================================
-- Campify — Perbaikan pendaftaran (signup) & tabel public.profiles
-- =============================================================================
-- GEJALA
--   supabase.auth.signUp() selalu gagal walau email valid, dengan respons:
--   {"code":500,"error_code":"unexpected_failure","msg":"Database error saving new user"}
--
-- PENYEBAB
--   Trigger `on_auth_user_created` pada schema `auth` gagal menyisipkan baris
--   ke `public.profiles` (mis. menyisipkan kolom `email` yang TIDAK ADA pada
--   tabel, atau kolom NOT NULL tanpa nilai). Karena berjalan di dalam
--   transaksi pembuatan user, seluruh signUp ikut dibatalkan.
--
-- CARA PAKAI
--   Supabase Dashboard → SQL Editor → tempel seluruh skrip ini → Run.
--   Skrip bersifat idempoten (aman dijalankan berulang).
--
-- CATATAN DIAGNOSTIK (opsional) — lihat nama trigger/fungsi yang terpasang:
--   select tgname, proname
--   from pg_trigger t
--   join pg_proc p on p.oid = t.tgfoid
--   where t.tgrelid = 'auth.users'::regclass and not t.tgisinternal;
-- =============================================================================

-- 1. Pastikan tabel profil ada dengan kolom & default yang benar --------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default 'Mahasiswa',
  university text not null default 'Kampus',
  role text not null default 'user',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 1b. Lengkapi kolom & default bila tabel sudah ada sebelumnya (idempoten) ----
alter table public.profiles add column if not exists full_name text default 'Mahasiswa';
alter table public.profiles add column if not exists university text default 'Kampus';
alter table public.profiles add column if not exists role text default 'user';
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists created_at timestamptz default now();
alter table public.profiles add column if not exists updated_at timestamptz default now();

alter table public.profiles alter column role set default 'user';
alter table public.profiles alter column full_name set default 'Mahasiswa';
alter table public.profiles alter column university set default 'Kampus';

-- 2. Fungsi trigger baru: HANYA menulis kolom yang benar-benar ada -----------
--    (id, full_name, university, role, created_at, updated_at) — tanpa `email`.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, university, role, created_at, updated_at)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'Mahasiswa'),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'university'), ''), 'Kampus'),
    'user',
    now(),
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- 3. Pasang ulang trigger pada auth.users ------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. Backfill: buatkan profil untuk user lama yang belum memilikinya ----------
insert into public.profiles (id, full_name, university, role, created_at, updated_at)
select
  u.id,
  coalesce(nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''), 'Mahasiswa'),
  coalesce(nullif(trim(u.raw_user_meta_data ->> 'university'), ''), 'Kampus'),
  'user',
  now(),
  now()
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

-- =============================================================================
-- 5. (Opsional) RLS — aktifkan hanya bila belum pernah diatur.
--    Aplikasi memakai `auth.uid()`; sinkronisasi profil (ensureUserProfile)
--    membutuhkan izin INSERT/UPDATE untuk baris milik sendiri.
--    Karena trigger di atas berjalan sebagai SECURITY DEFINER, RLS TIDAK
--    diperlukan agar pendaftaran berhasil.
-- =============================================================================
-- alter table public.profiles enable row level security;
--
-- drop policy if exists "profiles_select_own" on public.profiles;
-- create policy "profiles_select_own" on public.profiles
--   for select using (auth.uid() = id);
--
-- drop policy if exists "profiles_insert_own" on public.profiles;
-- create policy "profiles_insert_own" on public.profiles
--   for insert with check (auth.uid() = id);
--
-- drop policy if exists "profiles_update_own" on public.profiles;
-- create policy "profiles_update_own" on public.profiles
--   for update using (auth.uid() = id) with check (auth.uid() = id);
