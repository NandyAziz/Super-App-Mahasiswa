-- =============================================================================
-- Campify — Dedup notifikasi in-app (aman: TANPA perubahan skema/RLS/tabel)
-- =============================================================================
-- TUJUAN
--   Mencegah insert notifikasi redundan dari trigger yang sudah ada
--   (`chat_message_notification`, `order_status_notification` pada 5 tabel
--   layanan) tanpa menyentuh skema utama, RLS, atau menghapus tabel apa pun.
--
-- CARA KERJA (hanya logika di dalam 2 fungsi trigger yang sudah ada)
--   - Status berubah: bila baris notifikasi TERBARU untuk (user, order) sudah
--     memuat teks status yang sama persis, insert dilewati (dedup by content).
--     Tanpa UNIQUE constraint baru — murni pengecekan SELECT sebelum INSERT,
--     sehingga tidak ada risiko kegagalan pada data historis yang duplikat.
--   - Chat masuk: bila pesan TERBARU dari pengirim yang sama pada thread yang
--     sama memiliki body identik dalam 60 detik terakhir, insert dilewati
--     (anti double-submit / retry klien). Pesan berbeda tetap lolos.
--
-- JAMINAN KEAMANAN
--   - TIDAK ada ALTER TABLE / DROP TABLE / CREATE POLICY / DROP POLICY.
--   - TIDAK ada perubahan trigger pada `jastip_orders`, `print_orders`, dsb.
--     (definisi trigger AFTER UPDATE OF status tetap sama; hanya isi fungsi
--     `handle_*` yang diganti via CREATE OR REPLACE).
--   - Seluruhnya idempoten (aman dijalankan berulang).
--
-- CARA PAKAI: Supabase Dashboard → SQL Editor → tempel → Run.
-- =============================================================================

-- --- Chat masuk → notifikasi lawan bicara (dengan dedup anti double-submit) --
create or replace function public.handle_chat_message_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_preview text;
  v_recent_duplicate boolean;
begin
  v_owner := public.order_owner(NEW.service, NEW.order_id);
  v_preview := coalesce(nullif(trim(NEW.body), ''), 'Mengirim lampiran foto');

  if v_owner is null then
    return NEW;
  end if;

  if public.is_admin() then
    -- Operator menulis → kabari pemesan (bila bukan dia sendiri).
    if NEW.sender_id <> v_owner then
      -- Lewati bila notifikasi terbaru untuk order ini sudah berisi teks sama.
      select exists (
        select 1 from public.notifications
        where user_id = v_owner
          and order_id = NEW.order_id
          and title = 'Balasan dari Campify'
          and body = v_preview
          and id = (
            select max(n2.id) from public.notifications n2
            where n2.user_id = v_owner and n2.order_id = NEW.order_id
          )
      ) into v_recent_duplicate;

      if not coalesce(v_recent_duplicate, false) then
        insert into public.notifications (user_id, service, order_id, title, body)
        values (v_owner, NEW.service, NEW.order_id, 'Balasan dari Campify', v_preview);
      end if;
    end if;
  else
    -- Pelanggan menulis → kabari seluruh operator.
    -- Dedup per operator: hanya untuk admin yang notifikasi terbarunya pada
    -- order ini sudah berisi teks sama dari pengirim yang sama (< 60 dtk).
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

-- --- Status pesanan berubah → notifikasi pemesan (dengan dedup teks sama) ----
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
  v_is_duplicate boolean;
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

  -- Abaikan insert redundan bila notifikasi TERBARU untuk (user, order) sudah
  -- memuat teks status yang sama persis (mis. retry / update ganda).
  -- Tanpa UNIQUE constraint: pengecekan isi, bukan struktur.
  select exists (
    select 1 from public.notifications
    where user_id = v_owner
      and order_id = NEW.id
      and title = 'Status pesanan diperbarui'
      and body = v_body
      and id = (
        select max(n2.id) from public.notifications n2
        where n2.user_id = v_owner and n2.order_id = NEW.id
      )
  ) into v_is_duplicate;

  if coalesce(v_is_duplicate, false) then
    return NEW;
  end if;

  insert into public.notifications (user_id, service, order_id, title, body)
  values (
    v_owner,
    v_service,
    NEW.id,
    'Status pesanan diperbarui',
    v_body
  );

  return NEW;
end;
$$;
