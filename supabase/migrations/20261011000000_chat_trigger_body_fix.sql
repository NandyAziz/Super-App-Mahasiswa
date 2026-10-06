-- =============================================================================
-- Campify — Recovery: trigger chat gagal dengan "no field content"
-- =============================================================================
-- GEJALA (dari log server, sudah terverifikasi)
--   [Admin Chat] INSERT gagal: { code: '42703',
--     message: 'record "new" has no field "content"', service: 'printing', ... }
--   Chat tidak bisa dikirim dari `/admin` (maupun pelanggan).
--
-- PENYEBAB
--   Fungsi `public.handle_chat_message_notification()` yang TERPASANG di
--   database mere referensi `NEW.content`, sedangkan kolom pada tabel
--   `public.chat_messages` bernama **`body`** (lihat migrasi 20261004000000
--   "body text", dan src/features/chat/types.ts → CHAT_SELECT_COLUMNS =
--   "id, order_id, service, sender_id, body, ...").
--   Karena trigger `chat_message_notification` berjalan AFTER INSERT, error ini
--   membatalkan seluruh INSERT — pesan gagal total, bukan sekadar notifikasi
--   yang tidak muncul.
--
-- CATATAN
--   Tidak ada satupun file di repo ini yang memakai `NEW.content`; seluruh
--   migrasi memakai `NEW.body`. Jadi fungsi yang rusak itu berasal dari versi
--   yang pernah dijalankan manual di SQL Editor. Migrasi ini pasang ulang.
--
-- PERBAIKAN (2 bagian)
--   1. Fungsi dipasang ulang memakai `NEW.body` (nama kolom benar), sekaligus
--      mempertahankan dedup `ORDER BY created_at DESC LIMIT 1` (bukan MAX(uuid)
--      yang tidak valid untuk uuid di PostgreSQL < 18).
--   2. Bodies fungsi dibungkus blok `exception` agar kegagalan notifikasi TIDAK
--      lagi membatalkan penyimpanan pesan chat. Notifikasi bersifat pelengkap.
--
-- CAKUPAN ORDER
--   `public.order_owner()` memetakan 'jastip' → jastip_orders dan
--   'printing' → print_orders (dst. 3 tabel lain), jadi trigger ini tetap
--   menangani kedua layanan tersebut.
--
-- JAMINAN KEAMANAN
--   - TIDAK mengubah skema utama, struktur RLS, atau menghapus tabel apa pun.
--   - TIDAK menyentuh trigger pada `jastip_orders`, `print_orders`, dll.
--   - Hanya `CREATE OR REPLACE` 2 fungsi yang sudah ada; idempoten.
--
-- CARA PAKAI: Supabase Dashboard → SQL Editor → tempel → Run.
-- =============================================================================

-- --- Chat masuk → notifikasi lawan bicara (kolom `body` + tahan gagal) ------
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
  -- Notifikasi bersifat pelengkap: bila error di bawah, pesan chat tetap
  -- harus tersimpan. Tanpa blok ini satu kesalahan trigger membatalkan
  -- seluruh INSERT (terjadi pada versi sebelumnya: error 42703).
  begin
    v_owner := public.order_owner(NEW.service, NEW.order_id);
    -- ⚠️ Kolom isi pesan adalah `body` (bukan `content` / `message`).
    v_preview := coalesce(nullif(trim(NEW.body), ''), 'Mengirim lampiran foto');

    if v_owner is null then
      return NEW;
    end if;

    if public.is_admin() then
      -- Operator menulis → kabari pemesan (bila bukan dia sendiri).
      if NEW.sender_id <> v_owner then
        -- Pesan TERBARU untuk (pemesan, order) — tanpa MAX(uuid).
        select n.body into v_last_body
          from public.notifications n
          where n.user_id = v_owner and n.order_id = NEW.order_id
          order by n.created_at desc
          limit 1;

        -- Lewati bila pesan terbaru identik (anti double-submit / retry).
        if v_last_body is distinct from v_preview then
          insert into public.notifications (user_id, service, order_id, title, body)
          values (v_owner, NEW.service, NEW.order_id, 'Balasan dari Campify', v_preview);
        end if;
      end if;
    else
      -- Pelanggan menulis → kabari seluruh operator (dedup 60 detik per operator).
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
  exception when others then
    -- Jangan biarkan notifikasi membatalkan penyimpanan pesan chat.
    raise warning 'handle_chat_message_notification gagal (order %): %',
      NEW.order_id, sqlerrm;
  end;

  return NEW;
end;
$$;

-- --- Status pesanan berubah → notifikasi pemesan (tahan gagal) --------------
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
    select n.body into v_last_body
      from public.notifications n
      where n.user_id = v_owner and n.order_id = NEW.id
      order by n.created_at desc
      limit 1;

    -- Abaikan bila teks status-nya sama persis (retry / update ganda).
    if v_last_body is distinct from v_body then
      insert into public.notifications (user_id, service, order_id, title, body)
      values (v_owner, v_service, NEW.id, 'Status pesanan diperbarui', v_body);
    end if;
  exception when others then
    raise warning 'handle_order_status_notification gagal (order %): %',
      NEW.id, sqlerrm;
  end;

  return NEW;
end;
$$;

-- =============================================================================
-- VERIFIKASI (opsional, hanya membaca — tidak mengubah data)
-- =============================================================================
-- Pastikan fungsi terpasang memakai `NEW.body` dan tidak lagi `NEW.content`:
--
-- select position('NEW.body' in prosrc) > 0    as uses_body,
--        position('NEW.content' in prosrc) > 0 as uses_content,
--        position('max(' in prosrc) > 0        as uses_max_uuid
-- from pg_proc p
-- join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public'
--   and p.proname = 'handle_chat_message_notification';
--
-- Harinya: uses_body = true, uses_content = false, uses_max_uuid = false.