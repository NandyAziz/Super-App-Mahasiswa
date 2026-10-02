/**
 * Menerjemahkan pesan error mentah PostgREST/PostgreSQL menjadi pesan yang
 * ramah pengguna (Indonesia). Dipakai oleh seluruh Server Action agar kegagalan
 * constraint (foreign key, RLS, unique) tidak ditampilkan sebagai toast mentah.
 *
 * @param message  Pesan error asli dari Supabase (`error.message`).
 * @param fallback Pesan cadangan bila tidak ada pola yang dikenali.
 */
export function mapDatabaseError(
  message: string,
  fallback = "Terjadi kesalahan saat menyimpan data. Silakan coba lagi.",
): string {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("foreign key") ||
    normalized.includes("_fkey") ||
    normalized.includes("foreign_key")
  ) {
    return "Data akun Anda belum tersinkron dengan server. Silakan login ulang lalu coba lagi.";
  }

  if (
    normalized.includes("row-level security") ||
    normalized.includes("permission denied") ||
    normalized.includes("not authorized")
  ) {
    return "Anda tidak memiliki izin untuk melakukan aksi ini.";
  }

  if (
    normalized.includes("duplicate key") ||
    normalized.includes("unique constraint")
  ) {
    return "Data ini sudah ada. Silakan periksa kembali.";
  }

  if (normalized.includes("order_status")) {
    return "Database belum mengenal status pesanan tersebut. Jalankan migrasi enum order_status terlebih dahulu.";
  }

  if (
    (normalized.includes("column") && normalized.includes("does not exist")) ||
    normalized.includes("schema cache")
  ) {
    return "Database belum sinkron dengan versi aplikasi terbaru. Jalankan migrasi terbaru terlebih dahulu.";
  }

  if (
    normalized.includes("fetch failed") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("timeout") ||
    normalized.includes("melebihi batas waktu") ||
    normalized.includes("econnrefused") ||
    normalized.includes("enotfound")
  ) {
    return "Tidak dapat terhubung ke server. Periksa koneksi internet lalu coba lagi.";
  }

  return fallback;
}
