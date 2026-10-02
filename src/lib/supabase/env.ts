export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

/**
 * Mengembalikan env Supabase bila tersedia, atau `null` bila hilang/tidak valid.
 * Tidak pernah throw — dipakai oleh Proxy & Server Component agar halaman
 * auth (`/login`) tetap bisa dirender dengan fallback yang ramah.
 */
export function tryGetSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return null;
  }

  return { url, anonKey };
}

/** True bila env Supabase tersedia dan berbentuk URL valid. */
export function isSupabaseConfigured(): boolean {
  return tryGetSupabaseEnv() !== null;
}

/**
 * Membaca & memvalidasi environment variable Supabase.
 * Menghasilkan error yang jelas alih-alih nilai `undefined` saat runtime.
 */
export function getSupabaseEnv(): SupabaseEnv {
  const env = tryGetSupabaseEnv();

  if (!env) {
    throw new Error(
      "Supabase env tidak ditemukan. Set NEXT_PUBLIC_SUPABASE_URL dan " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY di file .env.local",
    );
  }

  return env;
}
