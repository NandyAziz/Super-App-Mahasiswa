-- =============================================================================
-- Campify — Kolom detail pesanan Jasa Cetak (print_orders)
-- =============================================================================
-- Menambahkan data yang diminta form "Jasa Cetak": kontak WhatsApp pemesan,
-- lokasi pengantaran, catatan kebutuhan khusus, serta opsi cetak tambahan
-- (ukuran kertas, sisi, jumlah salinan) yang sebelumnya hanya ada di UI.
--
-- CARA PAKAI
--   Supabase Dashboard → SQL Editor → tempel seluruh skrip ini → Run.
--   Skrip idempoten (aman dijalankan berulang).
-- =============================================================================

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

comment on column public.print_orders.contact_whatsapp is
  'Nomor WhatsApp aktif pemesan untuk konfirmasi & koordinasi mitra cetak.';
comment on column public.print_orders.delivery_location is
  'Lokasi antar/pengambilan hasil cetak (teks bebas).';
comment on column public.print_orders.custom_note is
  'Catatan kebutuhan khusus yang tidak tercakup opsi cetak standar.';
