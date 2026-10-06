-- =============================================================================
-- Campify — Live tracking, chat, dan notifikasi in-app
-- =============================================================================
-- 1. Enum `order_status`: nilai baru `out_for_delivery` (kurir di jalan).
-- 2. `order_trackings`  — posisi lat/lng terakhir pesanan (realtime).
-- 3. `chat_messages`    — chat internal pesanan + lampiran foto.
-- 4. `notifications`    — notifikasi in-app (bell) dengan baca/belum dibaca.
-- 5. Bucket `chat-attachments` + kebijakan Storage-nya.
-- 6. Trigger notifikasi: perubahan status pesanan & pesan chat masuk.
--
-- Seluruh skrip idempoten (aman dijalankan berulang).
-- CARA PAKAI: Supabase Dashboard → SQL Editor → tempel → Run.
-- =============================================================================

-- =============================================================================
-- 1. ENUM
-- =============================================================================
alter type public.order_status add value if not exists 'out_for_delivery';

-- =============================================================================
-- 2. HELPER (security definer agar tidak terhalang RLS tabel layanan)
-- =============================================================================

-- Pemilik pesanan untuk sebuah (service, order_id).
create or replace function public.order_owner(p_service text, p_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_owner uuid;
begin
  case p_service
    when 'jastip'    then select user_id     into v_owner from public.jastip_orders     where id = p_order_id;
    when 'printing'  then select user_id     into v_owner from public.print_orders      where id = p_order_id;
    when 'projects'  then select client_id   into v_owner from public.coding_projects   where id = p_order_id;
    when 'tutoring'  then select student_id  into v_owner from public.tutoring_sessions where id = p_order_id;
    when 'academic'  then select user_id     into v_owner from public.academic_services where id = p_order_id;
    else v_owner := null;
  end case;
  return v_owner;
end;
$$;

-- True bila user login adalah pemesan / partner pada pesanan tersebut.
create or replace function public.is_order_participant(
  p_service text,
  p_order_id uuid
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.jastip_orders t
    where p_service = 'jastip' and t.id = p_order_id
      and (t.user_id = auth.uid() or t.courier_id = auth.uid())
  ) or exists (
    select 1 from public.print_orders t
    where p_service = 'printing' and t.id = p_order_id
      and t.user_id = auth.uid()
  ) or exists (
    select 1 from public.coding_projects t
    where p_service = 'projects' and t.id = p_order_id
      and (t.client_id = auth.uid() or t.freelancer_id = auth.uid())
  ) or exists (
    select 1 from public.tutoring_sessions t
    where p_service = 'tutoring' and t.id = p_order_id
      and (t.student_id = auth.uid() or t.tutor_id = auth.uid())
  ) or exists (
    select 1 from public.academic_services t
    where p_service = 'academic' and t.id = p_order_id
      and t.user_id = auth.uid()
  );
$$;

-- =============================================================================
-- 3. TABEL
-- =============================================================================

-- Satu baris per pesanan: posisi kurir/operator terakhir (di-upsert).
create table if not exists public.order_trackings (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  service text not null check (
    service in ('jastip','printing','projects','tutoring','academic')
  ),
  lat double precision not null,
  lng double precision not null,
  note text,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (order_id, service)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  service text not null check (
    service in ('jastip','printing','projects','tutoring','academic')
  ),
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text,
  attachment_url text,
  created_at timestamptz not null default now(),
  -- Harus ada isi: teks dan/atau lampiran foto.
  check (coalesce(body, '') <> '' or coalesce(attachment_url, '') <> '')
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  service text check (
    service is null or service in ('jastip','printing','projects','tutoring','academic')
  ),
  order_id uuid,
  title text not null,
  body text not null default '',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_messages_thread
  on public.chat_messages (service, order_id, created_at);
create index if not exists idx_chat_messages_sender
  on public.chat_messages (sender_id, created_at);
create index if not exists idx_notifications_user
  on public.notifications (user_id, read, created_at desc);

-- =============================================================================
-- 4. ROW LEVEL SECURITY
-- =============================================================================
alter table public.order_trackings enable row level security;
alter table public.chat_messages   enable row level security;
alter table public.notifications   enable row level security;

-- --- order_trackings: dibaca peserta/admin, ditulis hanya operator ---------
drop policy if exists "tracking_select" on public.order_trackings;
create policy "tracking_select" on public.order_trackings
  for select using (
    public.is_admin() or public.is_order_participant(service, order_id)
  );

drop policy if exists "tracking_insert" on public.order_trackings;
create policy "tracking_insert" on public.order_trackings
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists "tracking_update" on public.order_trackings;
create policy "tracking_update" on public.order_trackings
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- --- chat_messages: riwayat-only (tanpa update/delete) ---------------------
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

-- --- notifications: pribadi ------------------------------------------------
drop policy if exists "notification_select" on public.notifications;
create policy "notification_select" on public.notifications
  for select using (user_id = auth.uid());

drop policy if exists "notification_insert" on public.notifications;
create policy "notification_insert" on public.notifications
  for insert to authenticated
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "notification_update" on public.notifications;
create policy "notification_update" on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "notification_delete" on public.notifications;
create policy "notification_delete" on public.notifications
  for delete to authenticated
  using (user_id = auth.uid());

-- =============================================================================
-- 5. SUPABASE REALTIME
-- =============================================================================
do $$
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    create publication supabase_realtime;
  end if;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.chat_messages;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.order_trackings;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;

-- Kolom penuh dikirim agar klien menerima isi pesan/baris terbaru.
alter table public.chat_messages     replica identity full;
alter table public.order_trackings   replica identity full;
alter table public.notifications     replica identity full;

-- =============================================================================
-- 6. SUPABASE STORAGE — BUCKET `chat-attachments`
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', true)
on conflict (id) do nothing;

drop policy if exists "chat_storage_read" on storage.objects;
create policy "chat_storage_read" on storage.objects
  for select using (bucket_id = 'chat-attachments');

drop policy if exists "chat_storage_insert" on storage.objects;
create policy "chat_storage_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'chat-attachments');

drop policy if exists "chat_storage_update_own" on storage.objects;
create policy "chat_storage_update_own" on storage.objects
  for update to authenticated
  using (owner = auth.uid() and bucket_id = 'chat-attachments')
  with check (owner = auth.uid());

drop policy if exists "chat_storage_delete_own" on storage.objects;
create policy "chat_storage_delete_own" on storage.objects
  for delete to authenticated
  using (owner = auth.uid() and bucket_id = 'chat-attachments');

-- =============================================================================
-- 7. TRIGGER NOTIFIKASI
-- =============================================================================
-- Dibuat `security definer` sehingga notifikasi selalu terisi walau penulisnya
-- bukan pihak yang berhak atas baris tujuan (mis. pelanggan → admin), dan
-- tidak dapat dipalsukan dari klien (klien tidak menulis `notifications`
-- untuk user lain).

-- --- Pesan chat masuk → notifikasi lawan bicara ----------------------------
create or replace function public.handle_chat_message_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_preview text;
begin
  v_owner := public.order_owner(NEW.service, NEW.order_id);
  v_preview := coalesce(nullif(trim(NEW.body), ''), 'Mengirim lampiran foto');

  if v_owner is null then
    return NEW;
  end if;

  if public.is_admin() then
    -- Operator menulis → kabari pemesan (bila bukan dia sendiri).
    if NEW.sender_id <> v_owner then
      insert into public.notifications (user_id, service, order_id, title, body)
      values (v_owner, NEW.service, NEW.order_id, 'Balasan dari Campify', v_preview);
    end if;
  else
    -- Pelanggan menulis → kabari seluruh operator.
    insert into public.notifications (user_id, service, order_id, title, body)
    select p.id, NEW.service, NEW.order_id, 'Pesan baru dari pelanggan', v_preview
    from public.profiles p
    where p.role = 'admin' and p.id <> NEW.sender_id;
  end if;

  return NEW;
end;
$$;

drop trigger if exists chat_message_notification on public.chat_messages;
create trigger chat_message_notification
  after insert on public.chat_messages
  for each row execute function public.handle_chat_message_notification();

-- --- Status pesanan berubah → notifikasi pemesan ---------------------------
create or replace function public.handle_order_status_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_service text;
begin
  if NEW.status is not distinct from OLD.status then
    return NEW;
  end if;

  case TG_TABLE_NAME
    when 'jastip_orders'    then v_owner := NEW.user_id;    v_service := 'jastip';
    when 'print_orders'     then v_owner := NEW.user_id;    v_service := 'printing';
    when 'coding_projects'  then v_owner := NEW.client_id;  v_service := 'projects';
    when 'tutoring_sessions' then v_owner := NEW.student_id; v_service := 'tutoring';
    when 'academic_services' then v_owner := NEW.user_id;   v_service := 'academic';
    else return NEW;
  end case;

  if v_owner is null then
    return NEW;
  end if;

  insert into public.notifications (user_id, service, order_id, title, body)
  values (
    v_owner,
    v_service,
    NEW.id,
    'Status pesanan diperbarui',
    'Pesanan kini berstatus ' || replace(NEW.status::text, '_', ' ')
  );

  return NEW;
end;
$$;

drop trigger if exists order_status_notification on public.jastip_orders;
create trigger order_status_notification
  after update of status on public.jastip_orders
  for each row execute function public.handle_order_status_notification();

drop trigger if exists order_status_notification on public.print_orders;
create trigger order_status_notification
  after update of status on public.print_orders
  for each row execute function public.handle_order_status_notification();

drop trigger if exists order_status_notification on public.coding_projects;
create trigger order_status_notification
  after update of status on public.coding_projects
  for each row execute function public.handle_order_status_notification();

drop trigger if exists order_status_notification on public.tutoring_sessions;
create trigger order_status_notification
  after update of status on public.tutoring_sessions
  for each row execute function public.handle_order_status_notification();

drop trigger if exists order_status_notification on public.academic_services;
create trigger order_status_notification
  after update of status on public.academic_services
  for each row execute function public.handle_order_status_notification();
