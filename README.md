# Campify — Super App Mahasiswa

Campify menyatukan lima layanan mahasiswa dalam satu aplikasi mobile-first:
**Jastip Cepat**, **Jasa Cetak**, **Marketplace Proyek IT**, **Tutor Privat**,
dan **Bantuan Akademik** — lengkap dengan pesanan, notifikasi, profil, dan
dashboard operator.

## Teknologi

- **Next.js 16** (App Router, Turbopack) + React 19
- **Supabase** (Auth, Postgres + RLS, Storage)
- **Tailwind CSS v4**, **Zod v4**, **Sonner**
- Deploy target: **Netlify** (adapter OpenNext, zero-config)

## Menjalankan Lokal

```bash
npm install
cp .env.example .env.local   # isi kredensial Supabase
npm run dev
```

Buka http://localhost:3000.

### Environment

Lihat [`.env.example`](./.env.example). Variabel wajib:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Opsional:

- `NEXT_PUBLIC_APP_URL` — origin publik untuk redirect OAuth/proxy (mis.
  `https://campify.example.com`). Bila kosong, aplikasi memakai header host
  (`x-forwarded-host`) atau `window.location.origin` secara otomatis.

## Pembayaran (Manual QRIS)

Pembayaran memakai **QRIS merchant statis** — ganti berkas
`public/images/qris-merchant.png` dengan QR merchant asli. Alur:

1. Pemesan memindai QR & membayar, lalu mengunggah **bukti transfer** di modal
   pembayaran → status pesanan menjadi `PENDING_VERIFICATION`.
2. Operator membuka **dashboard `/admin`**, melihat bukti, lalu menekan
   **Konfirmasi Pembayaran** → status menjadi `PAID` (Jastip: `accepted`).
3. Status lanjut `PAID → in_progress → completed` dikelola operator.

## Database (Supabase)

Jalankan migrasi di `supabase/migrations/` **secara berurutan** melalui
Supabase Dashboard → SQL Editor (semuanya idempoten):

1. `20261001000000_fix_profiles_signup.sql` — trigger profil & sinkronisasi awal
2. `20261001000001_campify_schema.sql` — **skema lengkap**: enum `order_status`
   (+`PENDING_VERIFICATION`, `PAID`), 5 tabel layanan + kolom
   `payment_proof_url`, indeks, helper `is_admin()`, seluruh kebijakan **RLS**,
   dan bucket Storage (termasuk `payment-proofs`) + kebijakannya
3. `20261002000000_add_print_order_details.sql` — kolom detail pesanan cetak
4. `20261003000000_print_orders_delivery_fee.sql` — kolom `delivery_fee` cetak
5. `20261004000000_tracking_chat_notifications.sql` — tracking, chat, notifikasi
6. `20261005000000_payment_proof_sync.sql` — **wajib bila error "Database belum
   sinkron" saat unggah bukti pembayaran**: memastikan ulang kolom
   `payment_proof_url` + enum `PENDING_VERIFICATION`/`PAID` bila database dibuat
   sebelum blok "2b"/enum di skema utama dijalankan
7. `20261006000000_notification_dedup.sql` — dedup notifikasi (logika fungsi
   trigger saja; tanpa perubahan skema/RLS/tabel)
8. `20261007000000_admin_chat_notifications.sql` — akses chat & notifikasi
   operator (aditif; tanpa perubahan skema/RLS yang ada)
9. `20261008000000_print_orders_sync.sql` — **wajib bila error "Database belum
   sinkron" saat membuat pesanan cetak**: memastikan ulang seluruh kolom
   `print_orders` (inti + detail form + `delivery_fee` + `payment_proof_url`)
10. `20261009000000_chat_profiles_backfill.sql` — **wajib bila operator tidak
    bisa mengirim chat dari `/admin`** (log: `[Admin Chat] INSERT gagal:` dengan
    `42501` / `GUARD_PARTICIPANT`): backfill baris `public.profiles` yang hilang
    agar `is_admin()` true. Akun baru tetap `role = 'user'` — penetapan operator
    dilakukan manual di bagian 3 skrip tersebut.
11. `20261010000000_chat_trigger_dedup_fix.sql` — mengganti dedup
    `MAX(uuid)` (tidak valid untuk uuid di PostgreSQL < 18) dengan
    `ORDER BY created_at DESC LIMIT 1`.
12. `20261011000000_chat_trigger_body_fix.sql` — **wajib bila chat gagal dengan
    `'record "new" has no field "content"'` (42703)**: memasang ulang trigger
    agar memakai kolom `body`, dan membungkus bodies trigger dalam blok
    `exception` sehingga notifikasi tidak lagi membatalkan penyimpanan pesan.
    Jalankan **setelah** `20261010000000`.
13. `20261012000000_cleanup_old_chat_notifications.sql` — pembersihan otomatis
    `notifications` & `chat_messages` yang lebih tua dari 7 hari via fungsi
    `cleanup_old_chat_and_notifications()`. Menjadwalkan harian bila `pg_cron`
    aktif (03:17 UTC); bila tidak, fungsi tetap bisa dipanggil manual.
14. `20261013000000_driver_destination_coords.sql` — menambahkan kolom
    `destination_lat` / `destination_lng` (nullable) pada 5 tabel pesanan
    untuk **peta navigasi driver** di `/admin` (marker mitra + tujuan, polyline
    biru via OSRM, estimasi jarak/waktu, tombol buka Google Maps). Wajib
    dijalankan sebelum memakai peta navigasi.
15. `20261014000000_notification_status_copy.sql` — mengganti judul generik
    "Status pesanan diperbarui" dengan copy per status yang ramah
    ("Pesanan Diproses", "Pesanan Dalam Pengiriman", "Pesanan Selesai",
    "Pesanan Dibatalkan"). Jalankan **setelah** `20261011000000`.
16. `20261015000000_self_delete_policies.sql` — **wajib untuk fitur "Hapus
    Semua"** di `/inbox`: menambah policy `delete` milik sendiri pada
    `notifications` (`user_id = auth.uid()`) dan `chat_messages`
    (`sender_id = auth.uid()`). Tanpa policy ini, `delete` ditolak RLS (42501).
    Aditif — tidak mengubah skema maupun policy lama.

Untuk menjadikan akun sebagai operator, set `role = 'admin'` pada baris
`public.profiles` yang bersangkutan.

## Deploy ke Netlify

1. Push repo ke Git, hubungkan ke Netlify (Next.js terdeteksi otomatis).
2. Set environment variable (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, dan opsional `NEXT_PUBLIC_APP_URL`) di
   **Site settings → Environment variables**.
3. Daftarkan domain produksi pada **Supabase Auth → URL Configuration** dan
   konsol OAuth Google/GitHub (redirect: `https://<domain>/auth/callback`).

`netlify.toml` sudah menyetel perintah build & versi Node.

## Skrip

```bash
npm run dev        # server pengembangan
npm run build      # build produksi
npm run start      # jalankan hasil build
npm run lint       # ESLint
npm run typecheck  # TypeScript (strict)
```
