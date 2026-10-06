import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pembayaran memakai Midtrans Snap (skrip dari app.midtrans.com) sehingga
  // tidak ada host gambar remote yang perlu di-whitelist — aset QRIS statis
  // lama (public/images/qris-merchant.png) masih dipakai untuk referensi.
};

export default nextConfig;
