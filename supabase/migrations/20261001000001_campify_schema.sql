-- =============================================================================
-- Campify — Skema lengkap: enum, tabel layanan, RLS, dan Supabase Storage
-- =============================================================================
-- SATU migrasi komprehensif yang menyatukan seluruh skema database Campify
-- yang sebelumnya dibuat manual di dashboard Supabase:
--   1. Enum `order_status` (termasuk 'PAID').
--   2. Lima tabel layanan: jastip, cetak, proyek IT, tutor, akademik.
--   3. Indeks, helper `is_admin()`, dan seluruh kebijakan Row Level Security
--      (RLS) untuk tabel layanan + `public.profiles`.
--   4. Bucket Supabase Storage + kebijakan aksesnya.
--
-- Bersifat idempoten (aman dijalankan berulang) dan diletakkan SETELAH
-- perbaikan profil (20261001000000) namun SEBELUM migrasi kolom detail cetak
-- (20261002000000) agar tabel `print_orders` sudah ada saat itu.
--
-- CARA PAKAI
--   Supabase Dashboard → SQL Editor → tempel seluruh skrip ini → Run.
-- =============================================================================

-- =============================================================================
-- 1. ENUM `order_status` (selaras dengan `features/orders/types.ts`)
-- =============================================================================
-- Nilai `'PAID'` berhuruf besar & case-sensitive sesuai kode aplikasi.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type public.order_status as enum (
      'pending',
      'PENDING_VERIFICATION',
      'accepted',
      'in_progress',
      'completed',
      'cancelled',
      'PAID'
    );
  end if;
end $$;

-- Pastikan nilai tambahan ada walau enum dibuat lebih dulu (idempoten).
alter type public.order_status add value if not exists 'PENDING_VERIFICATION';
alter type public.order_status add value if not exists 'PAID';

-- =============================================================================
-- 2. TABEL LAYANAN
-- =============================================================================
create table if not exists public.jastip_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  courier_id uuid references auth.users (id) on delete set null,
  item_name text not null,
  pickup_location text not null default 'Area Kampus (disesuaikan kurir)',
  dropoff_location text not null,
  delivery_tip integer not null default 0,
  status public.order_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.print_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  document_url text not null,
  print_type text not null default 'bw',
  binding_type text not null default 'none',
  total_pages integer not null default 1,
  status public.order_status not null default 'pending',
  created_at timestamptz not null default now(),
  contact_whatsapp text,
  delivery_location text,
  custom_note text,
  paper_size text,
  sides text,
  copies integer not null default 1
);

create table if not exists public.coding_projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users (id) on delete cascade,
  freelancer_id uuid references auth.users (id) on delete set null,
  title text not null,
  description text not null default '',
  tech_stack text[] not null default '{}',
  budget integer not null default 0,
  status public.order_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.tutoring_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users (id) on delete cascade,
  tutor_id uuid references auth.users (id) on delete set null,
  subject text not null,
  scheduled_at timestamptz not null default now(),
  price integer not null default 0,
  status public.order_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.academic_services (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  service_type text not null default 'proofreading',
  document_url text,
  notes text,
  status public.order_status not null default 'pending',
  created_at timestamptz not null default now()
);

-- 2b. Kolom bukti pembayaran (manual QRIS) -----------------------------------
-- Menyimpan URL bukti transfer yang diunggah pemesan; diverifikasi operator.
alter table public.jastip_orders add column if not exists payment_proof_url text;
alter table public.print_orders add column if not exists payment_proof_url text;
alter table public.coding_projects add column if not exists payment_proof_url text;
alter table public.tutoring_sessions add column if not exists payment_proof_url text;
alter table public.academic_services add column if not exists payment_proof_url text;

-- Indeks ringkas untuk kueri daftar per user (dipakai halaman Pesanan/Admin).
create index if not exists jastip_orders_user_id_idx on public.jastip_orders (user_id);
create index if not exists jastip_orders_courier_id_idx on public.jastip_orders (courier_id);
create index if not exists print_orders_user_id_idx on public.print_orders (user_id);
create index if not exists coding_projects_client_id_idx on public.coding_projects (client_id);
create index if not exists coding_projects_freelancer_id_idx on public.coding_projects (freelancer_id);
create index if not exists tutoring_sessions_student_id_idx on public.tutoring_sessions (student_id);
create index if not exists tutoring_sessions_tutor_id_idx on public.tutoring_sessions (tutor_id);
create index if not exists academic_services_user_id_idx on public.academic_services (user_id);

-- =============================================================================
-- 3. HELPER ADMIN
-- =============================================================================
-- `security definer` agar pemeriksaan peran tidak terkena RLS `profiles`
-- (mencegah rekursi kebijakan). Fail-safe: hanya `role = 'admin'`.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- =============================================================================
-- 4. ROW LEVEL SECURITY — TABEL LAYANAN
-- =============================================================================
alter table public.jastip_orders enable row level security;
alter table public.print_orders enable row level security;
alter table public.coding_projects enable row level security;
alter table public.tutoring_sessions enable row level security;
alter table public.academic_services enable row level security;

-- 4a. Jastip — pemesan melihat miliknya, kurir melihat orderan pending. --------
drop policy if exists "jastip_select" on public.jastip_orders;
create policy "jastip_select" on public.jastip_orders
  for select using (
    user_id = auth.uid()
    or courier_id = auth.uid()
    or status = 'pending'
    or public.is_admin()
  );

drop policy if exists "jastip_insert" on public.jastip_orders;
create policy "jastip_insert" on public.jastip_orders
  for insert with check (user_id = auth.uid());

drop policy if exists "jastip_update" on public.jastip_orders;
create policy "jastip_update" on public.jastip_orders
  for update using (
    user_id = auth.uid()
    or courier_id = auth.uid()
    or status = 'pending'
    or public.is_admin()
  ) with check (true);

drop policy if exists "jastip_delete" on public.jastip_orders;
create policy "jastip_delete" on public.jastip_orders
  for delete using (user_id = auth.uid() or public.is_admin());

-- 4b. Jasa Cetak — privat milik pemesan. --------------------------------------
drop policy if exists "print_select" on public.print_orders;
create policy "print_select" on public.print_orders
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "print_insert" on public.print_orders;
create policy "print_insert" on public.print_orders
  for insert with check (user_id = auth.uid());

drop policy if exists "print_update" on public.print_orders;
create policy "print_update" on public.print_orders
  for update using (user_id = auth.uid() or public.is_admin())
  with check (true);

drop policy if exists "print_delete" on public.print_orders;
create policy "print_delete" on public.print_orders
  for delete using (user_id = auth.uid() or public.is_admin());


-- 4c. Proyek IT — klien/freelancer + listing pending terbuka. ------------------
drop policy if exists "projects_select" on public.coding_projects;
create policy "projects_select" on public.coding_projects
  for select using (
    client_id = auth.uid()
    or freelancer_id = auth.uid()
    or status = 'pending'
    or public.is_admin()
  );

drop policy if exists "projects_insert" on public.coding_projects;
create policy "projects_insert" on public.coding_projects
  for insert with check (client_id = auth.uid());

drop policy if exists "projects_update" on public.coding_projects;
create policy "projects_update" on public.coding_projects
  for update using (
    client_id = auth.uid()
    or freelancer_id = auth.uid()
    or status = 'pending'
    or public.is_admin()
  ) with check (true);

drop policy if exists "projects_delete" on public.coding_projects;
create policy "projects_delete" on public.coding_projects
  for delete using (client_id = auth.uid() or public.is_admin());

-- 4d. Tutor — mahasiswa/tutor + tawaran pending terbuka. ----------------------
drop policy if exists "tutoring_select" on public.tutoring_sessions;
create policy "tutoring_select" on public.tutoring_sessions
  for select using (
    student_id = auth.uid()
    or tutor_id = auth.uid()
    or status = 'pending'
    or public.is_admin()
  );

drop policy if exists "tutoring_insert" on public.tutoring_sessions;
create policy "tutoring_insert" on public.tutoring_sessions
  for insert with check (student_id = auth.uid());

drop policy if exists "tutoring_update" on public.tutoring_sessions;
create policy "tutoring_update" on public.tutoring_sessions
  for update using (
    student_id = auth.uid()
    or tutor_id = auth.uid()
    or status = 'pending'
    or public.is_admin()
  ) with check (true);

drop policy if exists "tutoring_delete" on public.tutoring_sessions;
create policy "tutoring_delete" on public.tutoring_sessions
  for delete using (student_id = auth.uid() or public.is_admin());

-- 4e. Akademik — privat milik pemesan. ----------------------------------------
drop policy if exists "academic_select" on public.academic_services;
create policy "academic_select" on public.academic_services
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "academic_insert" on public.academic_services;
create policy "academic_insert" on public.academic_services
  for insert with check (user_id = auth.uid());

drop policy if exists "academic_update" on public.academic_services;
create policy "academic_update" on public.academic_services
  for update using (user_id = auth.uid() or public.is_admin())
  with check (true);

drop policy if exists "academic_delete" on public.academic_services;
create policy "academic_delete" on public.academic_services
  for delete using (user_id = auth.uid() or public.is_admin());

-- =============================================================================
-- 5. ROW LEVEL SECURITY — TABEL `profiles`
-- =============================================================================
-- SELECT terbuka untuk user terautentikasi karena fitur Tutor & Admin
-- menampilkan identitas (nama/kampus) mahasiswa lain. INSERT/UPDATE dibatasi
-- pemilik baris (atau admin).
alter table public.profiles enable row level security;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (auth.uid() is not null);

drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert" on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- =============================================================================
-- 6. SUPABASE STORAGE — BUCKET & KEBIJAKAN
-- =============================================================================
-- Empat bucket publik yang dipakai fitur unggah berkas. Publik untuk baca
-- (form memakai `getPublicUrl`), tulis hanya user terautentikasi.
insert into storage.buckets (id, name, public)
values
  ('print-documents', 'print-documents', true),
  ('project-briefs', 'project-briefs', true),
  ('tutoring-materials', 'tutoring-materials', true),
  ('academic-docs', 'academic-docs', true),
  ('payment-proofs', 'payment-proofs', true)
on conflict (id) do nothing;

drop policy if exists "campify_storage_read" on storage.objects;
create policy "campify_storage_read" on storage.objects
  for select using (
    bucket_id in (
      'print-documents', 'project-briefs', 'tutoring-materials', 'academic-docs',
      'payment-proofs'
    )
  );

drop policy if exists "campify_storage_insert" on storage.objects;
create policy "campify_storage_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in (
      'print-documents', 'project-briefs', 'tutoring-materials', 'academic-docs',
      'payment-proofs'
    )
  );

drop policy if exists "campify_storage_update_own" on storage.objects;
create policy "campify_storage_update_own" on storage.objects
  for update to authenticated
  using (
    owner = auth.uid()
    and bucket_id in (
      'print-documents', 'project-briefs', 'tutoring-materials', 'academic-docs',
      'payment-proofs'
    )
  )
  with check (owner = auth.uid());

drop policy if exists "campify_storage_delete_own" on storage.objects;
create policy "campify_storage_delete_own" on storage.objects
  for delete to authenticated
  using (
    owner = auth.uid()
    and bucket_id in (
      'print-documents', 'project-briefs', 'tutoring-materials', 'academic-docs',
      'payment-proofs'
    )
  );

