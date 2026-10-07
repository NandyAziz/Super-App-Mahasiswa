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
  // PWA: manifest + ikon Apple memakai aset lokal di /public (tanpa host remote).
  manifest: "/manifest.json",
  applicationName: "Campify",
  appleWebApp: {
    capable: true,
    title: "Campify",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  // `maximumScale` sengaja tidak dikunci: membiarkan pengguna tetap bisa
  // memperbesar (aksesibilitas). Yang dicegah hanyalah pantulan scroll
  // (overscroll) lewat CSS, bukan zoom.
  // Standalone mode: konten menembus notch/home-indicator di iOS.
  viewportFit: "cover",
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
