-- =============================================================================
-- Campify — Pelacakan pesanan publik (Guest Tracking `/track`)
-- =============================================================================
-- Halaman `/track` dapat diakses TANPA sesi (lihat PUBLIC_ROUTES di
-- `src/proxy.ts`). RLS tabel layanan bersifat ketat (`auth.uid()`), sehingga
-- anon tidak mungkin membaca baris pesanan secara langsung. Karena itu
-- disediakan SATU pintu baca sempit berupa fungsi `security definer`:
--
--   public.track_order(p_order_id uuid)
--
-- Prinsip keamanan:
--   1. HANYA kolom aman-publik yang dikembalikan: layanan, status, judul
--      ringkas, waktu dibuat, dan waktu pembaruan posisi terakhir.
--      Kolom sensitif (user_id, courier_id, dropoff_location, contact_whatsapp,
--      document_url, nominal tagihan, dan koordinat lat/lng kurir) TIDAK
--      pernah keluar dari fungsi ini.
--   2. Kunci akses adalah UUID pesanan itu sendiri. UUID v4 memiliki ~122 bit
--      entropi sehingga praktis tidak dapat ditebak/di-enumerasi — nilainya
--      berlaku sebagai "capability token" (pola lazim pelacakan publik).
--      Inilah alasan halaman ini TIDAK menerima kode ringkas `#PRT-A1B2C3`
--      yang hanya 24 bit dan mudah ditebak.
--   3. Fungsi `stable` + `security definer` + `search_path` dipin sehingga
--      tidak dapat dibajak lewat shadowing skema.
--
-- Seluruh skrip idempoten (aman dijalankan berulang).
-- CARA PAKAI: Supabase Dashboard → SQL Editor → tempel → Run.
-- =============================================================================

create or replace function public.track_order(p_order_id uuid)
returns table (
  service text,
  status public.order_status,
  reference text,
  created_at timestamptz,
  location_updated_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    found.service,
    found.status,
    found.reference,
    found.created_at,
    tr.updated_at as location_updated_at
  from (
    -- `reference` adalah judul ringkas yang aman dibaca pemilik tautan:
    -- nama barang (jastip), judul proyek, atau mata pelajaran (tutor).
    -- Layanan cetak & akademik sengaja `null` agar nama berkas privat
    -- (`document_url`) tidak ikut terekspos.
    select o.id as order_id, 'jastip'::text as service, o.status,
           o.item_name::text as reference, o.created_at
      from public.jastip_orders o
     where o.id = p_order_id
    union all
    select o.id, 'printing'::text, o.status, null::text, o.created_at
      from public.print_orders o
     where o.id = p_order_id
    union all
    select o.id, 'projects'::text, o.status, o.title::text, o.created_at
      from public.coding_projects o
     where o.id = p_order_id
    union all
    select o.id, 'tutoring'::text, o.status, o.subject::text, o.created_at
      from public.tutoring_sessions o
     where o.id = p_order_id
    union all
    select o.id, 'academic'::text, o.status, o.service_type::text, o.created_at
      from public.academic_services o
     where o.id = p_order_id
  ) as found
  left join public.order_trackings tr
    on tr.order_id = found.order_id
   and tr.service = found.service
  limit 1;
$$;

comment on function public.track_order(uuid) is
  'Baca status publik satu pesanan berbasis UUID (capability token) untuk halaman /track tanpa sesi. Hanya kolom aman-publik yang dikembalikan.';

-- Hak akses dipersempit: default Postgres memberi EXECUTE ke PUBLIC, maka
-- dicabut dahulu lalu diberikan eksplisit hanya kepada `anon` (tamu) dan
-- `authenticated` (pengguna login yang membuka /track).
revoke all on function public.track_order(uuid) from public;
grant execute on function public.track_order(uuid) to anon, authenticated;
