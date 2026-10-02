import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pembayaran memakai QRIS merchant statis (aset lokal
  // `public/images/qris-merchant.png`) sehingga tidak ada host gambar remote
  // yang perlu di-whitelist.
};

export default nextConfig;
