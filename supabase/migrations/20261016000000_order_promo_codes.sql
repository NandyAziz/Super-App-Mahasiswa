-- =============================================================================
-- Campify — Promo pada pesanan Jastip & Cetak
-- =============================================================================
-- Menambahkan kolom `promo_code` pada `jastip_orders` dan `print_orders`
-- untuk mencatat promo yang dipakai (lihat src/features/promos/catalog.ts).
--
-- Kolom ini dipakai untuk AUDIT, bukan untuk menghitung harga: nominal ongkir
-- selalu dihitung ulang di Server Action. `LOYALTY3RD` & `PATUNGAN` sudah
-- tercermin pada `delivery_tip` / `delivery_fee`; `PAKET_SKRIPSI` hanya
-- mencatat klaim karena biaya cetak dikonfirmasi manual via WhatsApp.
--
-- ConstRAINT membatasi isi kolom ke kode yang memang dikenal, sehingga nilai
-- aneh tidak bisa masuk lewat jalur lain (mis. Pen bumped langsung).
--
-- Kolom nullable + default NULL: pesanan lama tanpa promo tetap valid dan
-- tidak perlu backfill.
--
-- CARA PAKAI
--   Supabase Dashboard → SQL Editor → tempel seluruh skrip ini → Run.
--   Skrip idempoten (aman dijalankan berulang).
-- =============================================================================

alter table public.jastip_orders
  add column if not exists promo_code text;

alter table public.print_orders
  add column if not exists promo_code text;

comment on column public.jastip_orders.promo_code is
  'Kode promo terverifikasi yang dipakai titipan ini (LOYALTY3RD / PATUNGAN).';

comment on column public.print_orders.promo_code is
  'Kode promo terverifikasi yang dipakai pesanan cetak ini (PAKET_SKRIPSI).';

-- Penjaga integritas: hanya kode promo yang terdaftar yang boleh tersimpan.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'jastip_orders_promo_code_check'
  ) then
    alter table public.jastip_orders
      add constraint jastip_orders_promo_code_check
      check (
        promo_code is null
        or promo_code in ('LOYALTY3RD', 'PATUNGAN')
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'print_orders_promo_code_check'
  ) then
    alter table public.print_orders
      add constraint print_orders_promo_code_check
      check (
        promo_code is null
        or promo_code = 'PAKET_SKRIPSI'
      );
  end if;
end $$;
