import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client dengan **service role** — HANYA untuk sisi server
 * (Route Handler webhook yang tidak memiliki sesi user, mis. notifikasi
 * Midtrans). Key ini melewati RLS sehingga tidak boleh pernah diekspos ke
 * browser atau masuk ke variabel `NEXT_PUBLIC_*`.
 *
 * Melempar error ramah bila `SUPABASE_SERVICE_ROLE_KEY` belum di-set.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase service role belum dikonfigurasi. Set " +
        "SUPABASE_SERVICE_ROLE_KEY di file .env.local.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
