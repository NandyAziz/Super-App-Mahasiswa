-- =============================================================================
-- Campify — Koordinat tujuan untuk peta navigasi driver (/admin)
-- =============================================================================
-- TUJUAN
--   Menyimpan koordinat GPS lokasi tujuan (pelanggan) pada 5 tabel pesanan
--   agar panel `/admin` dapat menampilkan peta rute driver → tujuan:
--   marker mitra, marker tujuan, polyline biru via OSRM, estimasi jarak/waktu,
--   dan tombol "Buka Navigasi di Google Maps".
--
-- KENAPA KOLOM BARU
--   Schema lama hanya menyimpan lokasi sebagai TEKS BEBAS (mis.
--   `jastip_orders.dropoff_location`, `print_orders.delivery_location`), yang
--   tidak bisa dipetakan tanpa geocoding. `order_trackings.lat/lng` hanya
--   menyimpan posisi KURIR, bukan tujuan. Maka koordinat tujuan perlu kolom
--   terpisah, nullable agar pesanan lama & form yang belum mengirim koordinat
--   tetap berjalan normal.
--
-- JAMINAN KEAMANAN (sesuai Safety Guidelines)
--   - TIDAK mengubah skema utama, struktur RLS, atau menghapus tabel/kolom.
--   - TIDAK menyentuh trigger pada tabel pesanan mana pun.
--   - Hanya menambah 2 kolom NULLABLE per tabel (idempoten).
--   - Koordinat diisi pemesan dari peramban (`navigator.geolocation`) saat
--     membuat pesanan, bukan dari klien yang bebas menulis kolom status.
--
-- CATATAN KEAMANAN
--   Koordinat tujuan bersifat data pribadi (lokasi pelanggan). Kolom ini
--   dibaca hanya oleh operator/admin lewat RLS `*_select` yang sudah ada
--   (`user_id = auth.uid() or is_admin()`), jadi tidak ada policy baru.
--
-- CARA PAKAI: Supabase Dashboard → SQL Editor → tempel → Run.
-- =============================================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'jastip_orders', 'print_orders', 'coding_projects',
    'tutoring_sessions', 'academic_services'
  ]
  loop
    execute format(
      'alter table public.%I add column if not exists destination_lat double precision',
      t
    );
    execute format(
      'alter table public.%I add column if not exists destination_lng double precision',
      t
    );
  end loop;
end;
$$;

comment on column public.jastip_orders.destination_lat is
  'Latitude lokasi tujuan (WGS84) untuk peta navigasi driver.';
comment on column public.jastip_orders.destination_lng is
  'Longitude lokasi tujuan (WGS84) untuk peta navigasi driver.';

-- =============================================================================
-- VERIFIKASI (opsional, hanya membaca)
-- =============================================================================
-- select table_name, column_name, data_type
-- from information_schema.columns
-- where table_schema = 'public'
--   and column_name in ('destination_lat', 'destination_lng')
-- order by table_name, column_name;
-- Harinya: 10 baris (5 tabel x 2 kolom).