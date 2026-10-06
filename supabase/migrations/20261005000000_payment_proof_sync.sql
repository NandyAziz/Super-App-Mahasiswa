-- =============================================================================
-- Campify — Sinkronisasi pembayaran manual QRIS (payment proof)
-- =============================================================================
-- GEJALA
--   Unggah bukti pembayaran jastip gagal dengan toast:
--   "Database belum sinkron dengan versi aplikasi terbaru."
--   Toast itu berasal dari `mapDatabaseError()` (src/lib/supabase/errors.ts)
--   untuk error PostgREST "schema cache" / "column ... does not exist".
--
-- PENYEBAB
--   `submitPaymentProofAction` (src/features/payment/actions.ts) melakukan
--   UPDATE { payment_proof_url, status='PENDING_VERIFICATION' } ke 5 tabel
--   layanan. Kolom `payment_proof_url` hanya ditambahkan oleh blok "2b" di
--   migrasi 20261001000001, dan nilai enum 'PENDING_VERIFICATION' oleh blok
--   "1" di migrasi yang sama. Bila blok "2b"/enum belum dijalankan di database
--   produksi (mis. tabel dibuat manual lebih dulu via dashboard), UPDATE gagal
--   dengan error schema-cache dan toast di atas muncul.
--
-- CARA PAKAI
--   Supabase Dashboard → SQL Editor → tempel seluruh skrip ini → Run.
--   Skrip idempoten (aman dijalankan berulang). Setelah itu jalankan ulang
--   unggah bukti pembayaran jastip; bila masih gagal, lihat log server pada
--   baris "[Payment Proof] UPDATE gagal:" untuk detail code/message.
-- =============================================================================

-- 1. Pastikan nilai enum untuk alur pembayaran manual tersedia ---------------
alter type public.order_status add value if not exists 'PENDING_VERIFICATION';
alter type public.order_status add value if not exists 'PAID';

-- 2. Pastikan kolom bukti pembayaran ada di seluruh tabel layanan ------------
alter table public.jastip_orders
  add column if not exists payment_proof_url text;

alter table public.print_orders
  add column if not exists payment_proof_url text;

alter table public.coding_projects
  add column if not exists payment_proof_url text;

alter table public.tutoring_sessions
  add column if not exists payment_proof_url text;

alter table public.academic_services
  add column if not exists payment_proof_url text;

-- 3. Komentar dokumentasi (tidak mengubah data) -------------------------------
comment on column public.jastip_orders.payment_proof_url is
  'URL bukti transfer manual QRIS yang diunggah pemesan; diverifikasi operator.';
comment on column public.print_orders.payment_proof_url is
  'URL bukti transfer manual QRIS yang diunggah pemesan; diverifikasi operator.';
comment on column public.coding_projects.payment_proof_url is
  'URL bukti transfer manual QRIS yang diunggah pemesan; diverifikasi operator.';
comment on column public.tutoring_sessions.payment_proof_url is
  'URL bukti transfer manual QRIS yang diunggah pemesan; diverifikasi operator.';
comment on column public.academic_services.payment_proof_url is
  'URL bukti transfer manual QRIS yang diunggah pemesan; diverifikasi operator.';

-- 4. Verifikasi (baca saja — pastikan 5 baris 't' dan 2 nilai enum muncul) ----
-- select table_name,
--        (select count(*) from information_schema.columns
--          where table_schema = 'public' and columns.table_name = t.table_name
--            and column_name = 'payment_proof_url') = 1 as has_payment_proof_url
-- from (values ('jastip_orders'), ('print_orders'), ('coding_projects'),
--              ('tutoring_sessions'), ('academic_services')) as t(table_name);
-- select enumlabel from pg_enum e
-- join pg_type t on t.oid = e.enumtypid
-- where t.typname = 'order_status' and e.enumlabel in ('PENDING_VERIFICATION', 'PAID');
