import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { LaunchScreen } from "@/components/LaunchScreen";
import "./globals.css";

// Catatan: `next/font/google` (Geist) sengaja tidak dipakai di sini karena
// fetch font jarak jauh saat prerender dapat memicu `fetch failed` pada
// halaman auth (`/login`) di lingkungan offline / DNS terbatas.
// Sebagai fallback graceful, gunakan system font stack agar login tetap
// bisa dirender tanpa ketergantungan jaringan eksternal.

export const metadata: Metadata = {
  title: "Campify - Super App Mahasiswa",
  description:
    "Campify menyatukan jastip, jasa cetak, marketplace proyek IT, tutor privat, dan asisten akademik mahasiswa dalam satu aplikasi.",
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="font-sans antialiased">
        <LaunchScreen />
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
