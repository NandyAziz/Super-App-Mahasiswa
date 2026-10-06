-- =============================================================================
-- Campify — Sinkronisasi kolom tabel `print_orders` (pesanan cetak)
-- =============================================================================
-- GEJALA
--   Membuat pesanan cetak (/printing) gagal dengan toast:
--   "Database belum sinkron dengan versi aplikasi terbaru."
--   Toast itu berasal dari `mapDatabaseError()` (src/lib/supabase/errors.ts)
--   untuk error PostgREST "schema cache" / "column ... does not exist".
--
-- PENYEBAB
--   `createPrintOrderAction` (src/features/printing/actions.ts) melakukan
--   INSERT { user_id, document_url, copies, contact_whatsapp,
--   delivery_location, custom_note, delivery_fee, status='pending' } ke
--   `print_orders`, sementara `getPrintOrdersAction` memakai `select("*")`.
--   Kolom-kolom tersebut tersebar di 4 migrasi berbeda (skema utama,
--   detail cetak, delivery_fee, payment_proof). Bila database produksi dibuat
--   sebelum salah satunya dijalankan (mis. tabel dibuat manual via dashboard),
--   INSERT gagal dengan error schema-cache dan toast di atas muncul.
--
-- CAKUPAN (sesuai kontrak kode — TANPA kolom fiktif)
--   Kode tidak pernah memakai `file_url` atau `notes` pada `print_orders`
--   (dokumen = `document_url`, catatan = `custom_note`); migrasi ini
--   memastikan kolom yang benar-benar dipakai + kolom opsi cetak ber-default:
--   user_id, document_url, print_type, binding_type, total_pages, status,
--   created_at, contact_whatsapp, delivery_location, custom_note, paper_size,
--   sides, copies, delivery_fee, payment_proof_url.
--
-- CARA PAKAI
--   Supabase Dashboard → SQL Editor → tempel seluruh skrip ini → Run.
--   Skrip idempoten (aman dijalankan berulang). Setelah itu buat ulang
--   pesanan cetak; bila masih gagal, lihat log server pada baris
--   "[Print Order] INSERT gagal:" untuk detail code/message.
-- =============================================================================

-- 1. Kolom inti (skema utama 20261001000001) ----------------------------------
alter table public.print_orders
  add column if not exists user_id uuid references auth.users (id) on delete cascade;

alter table public.print_orders
  add column if not exists document_url text;

alter table public.print_orders
  add column if not exists print_type text not null default 'bw';

alter table public.print_orders
  add column if not exists binding_type text not null default 'none';

alter table public.print_orders
  add column if not exists total_pages integer not null default 1;

alter table public.print_orders
  add column if not exists status public.order_status not null default 'pending';

alter table public.print_orders
  add column if not exists created_at timestamptz not null default now();

-- 2. Kolom detail form (migrasi 20261002000000) --------------------------------
alter table public.print_orders
  add column if not exists contact_whatsapp text;

alter table public.print_orders
  add column if not exists delivery_location text;

alter table public.print_orders
  add column if not exists custom_note text;

alter table public.print_orders
  add column if not exists paper_size text;

alter table public.print_orders
  add column if not exists sides text;

alter table public.print_orders
  add column if not exists copies integer not null default 1;

-- 3. Ongkir (migrasi 20261003000000) -------------------------------------------
alter table public.print_orders
  add column if not exists delivery_fee integer not null default 0;

-- 4. Bukti pembayaran (migrasi 20261005000000) ----------------------------------
alter table public.print_orders
  add column if not exists payment_proof_url text;

-- 5. Komentar dokumentasi (tidak mengubah data) ---------------------------------
comment on column public.print_orders.document_url is
  'Tautan dokumen yang akan dicetak (diunggah pemesan).';
comment on column public.print_orders.copies is
  'Jumlah salinan yang diminta.';
comment on column public.print_orders.delivery_fee is
  'Ongkir pengiriman hasil cetak; dihitung ulang di server dari delivery_location.';
comment on column public.print_orders.payment_proof_url is
  'URL bukti transfer manual QRIS yang diunggah pemesan; diverifikasi operator.';

-- 6. Verifikasi (baca saja — pastikan seluruh baris 't') -----------------------
-- select column_name, data_type, column_default, is_nullable
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'print_orders'
-- order by ordinal_position;
