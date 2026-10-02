import { redirect } from "next/navigation";

/**
 * Alias kompatibilitas untuk halaman pendaftaran.
 *
 * Rute pendaftaran utama Campify adalah `/register`. Halaman ini mengarahkan
 * `/signup` ke `/register` agar tautan lama / pintasan eksternal tetap bekerja
 * dan tidak salah dibaca sebagai rute terproteksi (yang akan melempar ke
 * `/login`).
 */
export default function SignupPage() {
  redirect("/register");
}