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
