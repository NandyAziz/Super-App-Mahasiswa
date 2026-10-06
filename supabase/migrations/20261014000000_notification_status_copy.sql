-- =============================================================================
-- Campify — Copy notifikasi status pesanan yang ramah & simpel
-- =============================================================================
-- MASALAH
--   Trigger `handle_order_status_notification` memakai judul generik
--   "Status pesanan diperbarui" dengan body
--   "Pesanan kini berstatus <status>" — sehingga memunculkan string mentah
--   seperti "in progress", "out for delivery", "PAID" di UI.
--
-- PERBAIKAN
--   Setiap status dipetakan ke judul + deskripsi Bahasa Indonesia yang simpel.
--   Nilainya SAMA PERSIS dengan `src/features/notifications/status-copy.ts`
--   (satu-satunya sumber kebenaran di sisi aplikasi) — ubah keduanya
--   bersamaan bila ingin menyunting redaksi.
--
--   in_progress        -> "Pesanan Diproses"
--   out_for_delivery   -> "Pesanan Dalam Pengiriman"
--   completed          -> "Pesanan Selesai"
--   cancelled          -> "Pesanan Dibatalkan"
--
-- CATATAN DEDUP
--   Karena judul kini berbeda per status, pembanding dedup memakai PASANGAN
--   (title + body), bukan body saja. Notifikasi lama bertitel generik tidak
--   lagi dianggap duplikat sehingga status baru tetap terkirim.
--
-- JAMINAN KEAMANAN (sesuai Safety Guidelines)
--   - TIDAK mengubah skema utama, struktur RLS, atau menghapus tabel/kolom.
--   - TIDAK menyentuh definisi trigger pada `jastip_orders`, `print_orders`,
--     dll. Hanya isi fungsi yang diganti.
--   - `handle_chat_message_notification` TIDAK diubah.
--   - Idempoten (aman dijalankan berulang).
--
-- CARA PAKAI: Supabase Dashboard → SQL Editor → tempel → Run.
-- =============================================================================

create or replace function public.handle_order_status_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_service text;
  v_title text;
  v_body text;
  v_last_title text;
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

    -- Copy ramah per status (sinkron dengan status-copy.ts).
    case NEW.status::text
      when 'in_progress'
        then v_title := 'Pesanan Diproses';
             v_body  := 'Pesananmu sedang diproses oleh Tim Campify.';
      when 'out_for_delivery'
        then v_title := 'Pesanan Dalam Pengiriman';
             v_body  := 'Tim Campify sedang mengantarkan pesanan ke lokasimu.';
      when 'completed'
        then v_title := 'Pesanan Selesai';
             v_body  := 'Pesananmu sudah selesai diantarkan. Terima kasih!';
      when 'cancelled'
        then v_title := 'Pesanan Dibatalkan';
             v_body  := 'Pesananmu telah dibatalkan.';
      when 'PAID'
        then v_title := 'Pembayaran Diterima';
             v_body  := 'Pembayaranmu sudah diterima. Terima kasih!';
      when 'PENDING_VERIFICATION'
        then v_title := 'Menunggu Verifikasi';
             v_body  := 'Pesananmu sedang diverifikasi pembayaran oleh Tim Campify.';
      when 'accepted'
        then v_title := 'Pesanan Diterima';
             v_body  := 'Pesananmu telah diterima Tim Campify.';
      else
        v_title := 'Pesanan Diterima';
        v_body  := 'Pesananmu sudah masuk dan menunggu diproses Tim Campify.';
    end case;

    -- Notifikasi TERBARU untuk (pemesan, order) — tanpa MAX(uuid).
    select n.title, n.body into v_last_title, v_last_body
      from public.notifications n
      where n.user_id = v_owner and n.order_id = NEW.id
      order by n.created_at desc
      limit 1;

    -- Abaikan bila pasangan (judul, body) sama persis (retry / update ganda).
    if v_last_title is distinct from v_title or v_last_body is distinct from v_body then
      insert into public.notifications (user_id, service, order_id, title, body)
      values (v_owner, v_service, NEW.id, v_title, v_body);
    end if;
  exception when others then
    -- Notifikasi bersifat pelengkap: kegagalan tidak membatalkan update status.
    raise warning 'handle_order_status_notification gagal (order %): %',
      NEW.id, sqlerrm;
  end;

  return NEW;
end;
$$;