import { MobileFrame } from "@/components/layouts/MobileFrame";

/**
 * Kerangka umum untuk seluruh layar autentikasi Campify.
 *
 * Layout ini sengaja dibuat netral (tanpa perataan maupun padding) agar setiap
 * halaman bebas menentukan tata letaknya sendiri:
 * - `/login` memakai header ilustrasi full-bleed dengan kartu yang menindih
 *   (overlap) tepat di bawahnya.
 * - `/register` tetap memakai kartu putih terpusat.
 *
 * Lebar kanvas tetap dibatasi `max-w-md` lewat `MobileFrame` (native mobile canvas).
 */
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <MobileFrame className="bg-slate-100">{children}</MobileFrame>;
}
