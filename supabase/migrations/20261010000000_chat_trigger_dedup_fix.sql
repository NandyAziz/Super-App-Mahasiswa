-- =============================================================================
-- Campify — Perbaikan trigger notifikasi chat (dedup tanpa MAX(uuid))
-- =============================================================================
-- GEJALA
--   1. Notifikasi chat/status tidak pernah muncul, atau
--   2. saat status/chat diproses, trigger gagal dengan:
--        ERROR: function max(uuid) does not exist
--      (PostgreSQL baru menambah aggregate min()/max() untuk uuid di v18;
--       Supabase masih 15/17 → `max(n2.id)` pada kolom uuid itu INVALID).
--
-- PERBAIKAN (2 hal)
--   a. Struktur dedup "pesan terakhir" diganti dari `id = (select max(...))`
--      menjadi `order by created_at desc limit 1`. Semantik sama-sama
--      mengambil satu baris terbaru, namun tidak bergantung pada aggregate
--      yang tidak tersedia untuk uuid — dan sesuai indeks
--      `idx_notifications_user (user_id, order_id?)`.
--   b. Kolom isi pesan tetap `NEW.body`.
--      ⚠️ PENTING: kolom di `public.chat_messages` adalah **body**, BUKAN
--      `content` dan BUKAN `message`. see: migrasi 20261004000000 ("body text")
--      dan src/features/chat/types.ts (CHAT_SELECT_COLUMNS). Memakai `NEW.content`
--      akan membuat trigger gagal saat dipanggil ("record new has no field").
--
-- CAKUPAN ORDER
--   `public.order_owner()` sudah memetakan 'jastip' -> public.jastip_orders
--   dan 'printing' -> public.print_orders (dst. 5 tabel), sehingga trigger ini
--   otomatis menangani keduanya lewat fungsi tersebut.
--
-- JAMINAN KEAMANAN
--   - TIDAK mengubah skema utama, struktur RLS, atau menghapus tabel apa pun.
--   - TIDAK menyentuh trigger pada `jastip_orders`, `print_orders`, dll.
--     Hanya isi 2 fungsi yang sudah ada (CREATE OR REPLACE).
--   - Idempoten (aman dijalankan berulang).
--
-- CARA PAKAI: Supabase Dashboard → SQL Editor → tempel → Run.
-- =============================================================================

-- --- Chat masuk → notifikasi lawan bicara (dedup pesan terakhir) --------------
create or replace function public.handle_chat_message_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_preview text;
  v_last_body text;
begin
  v_owner := public.order_owner(NEW.service, NEW.order_id);
  -- Kolom isi pesan pada tabel adalah `body`.
  v_preview := coalesce(nullif(trim(NEW.body), ''), 'Mengirim lampiran foto');

  if v_owner is null then
    return NEW;
  end if;

  if public.is_admin() then
    -- Operator menulis → kabari pemesan (bila bukan dia sendiri).
    if NEW.sender_id <> v_owner then
      -- Pesan TERBARU untuk (pemesan, order) ini — tanpa MAX(uuid).
      select n.body
        into v_last_body
        from public.notifications n
        where n.user_id = v_owner
          and n.order_id = NEW.order_id
        order by n.created_at desc
        limit 1;

      -- Lewati bila pesan terbaru identik (anti double-submit / retry).
      if v_last_body is distinct from v_preview then
        insert into public.notifications (user_id, service, order_id, title, body)
        values (v_owner, NEW.service, NEW.order_id, 'Balasan dari Campify', v_preview);
      end if;
    end if;
  else
    -- Pelanggan menulis → kabari seluruh operator.
    -- Dedup per operator: lewati bila pesan identik dari pengirim yang sama
    -- dalam 60 detik terakhir.
    insert into public.notifications (user_id, service, order_id, title, body)
    select p.id, NEW.service, NEW.order_id, 'Pesan baru dari pelanggan', v_preview
    from public.profiles p
    where p.role = 'admin' and p.id <> NEW.sender_id
      and not exists (
        select 1 from public.notifications n
        where n.user_id = p.id
          and n.order_id = NEW.order_id
          and n.title = 'Pesan baru dari pelanggan'
          and n.body = v_preview
          and n.created_at > now() - interval '60 seconds'
      );
  end if;

  return NEW;
end;
$$;

-- --- Status pesanan berubah → notifikasi pemesan (tanpa MAX(uuid)) ------------
create or replace function public.handle_order_status_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_service text;
  v_body text;
  v_last_body text;
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

  v_body := 'Pesanan kini berstatus ' || replace(NEW.status::text, '_', ' ');

  -- Notifikasi TERBARU untuk (pemesan, order) — tanpa MAX(uuid).
  select n.body
    into v_last_body
    from public.notifications n
    where n.user_id = v_owner
      and n.order_id = NEW.id
    order by n.created_at desc
    limit 1;

  -- Abaikan bila teks status-nya sama persis (retry / update ganda).
  if v_last_body is distinct from v_body then
    insert into public.notifications (user_id, service, order_id, title, body)
    values (v_owner, v_service, NEW.id, 'Status pesanan diperbarui', v_body);
  end if;

  return NEW;
end;
$$;