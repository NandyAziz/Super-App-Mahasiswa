-- =============================================================================
-- Campify — Ongkir pengiriman untuk pesanan Jasa Cetak (print_orders)
-- =============================================================================
-- Menambahkan kolom `delivery_fee` yang menyimpan ongkir hasil hitungan Server
-- Action dari teks `delivery_location` (lihat src/features/printing/delivery.ts).
-- Kolom ini ikut menentukan total yang dibayar pemesan, sehingga pesanan cetak
-- kini memunculkan tombol bayar (QRIS) untuk ongkirnya.
--
-- Baris lama di-backfill 0: biaya cetaknya sendiri masih dikonfirmasi mitra
-- via WhatsApp, jadi hanya ongkir yang ditagihkan di muka.
--
-- CARA PAKAI
--   Supabase Dashboard → SQL Editor → tempel seluruh skrip ini → Run.
--   Skrip idempoten (aman dijalankan berulang).
-- =============================================================================

alter table public.print_orders
  add column if not exists delivery_fee integer not null default 0;

comment on column public.print_orders.delivery_fee is
  'Ongkir pengiriman hasil cetak; dihitung ulang di server dari delivery_location.';
