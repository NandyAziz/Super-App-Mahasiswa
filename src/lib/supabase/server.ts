import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";
import { fetchWithSupabaseTimeout } from "./fetch-with-timeout";

type ServerSupabaseClient = ReturnType<typeof createServerClient>;

/**
 * Supabase client untuk Server Component / Server Action / Route Handler.
 * `cookies()` bersifat async pada Next.js 16 sehingga wajib di-await.
 *
 * Seluruh request jaringan dibatasi timeout 5 detik via `global.fetch`
 * agar tidak menggantung 10+ detik di jaringan lambat.
 */
export async function createSupabaseServerClient(): Promise<ServerSupabaseClient> {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient(url, anonKey, {
    global: { fetch: fetchWithSupabaseTimeout },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Dipanggil dari Server Component (read-only). Aman diabaikan;
          // refresh session ditangani oleh middleware.
        }
      },
    },
  });
}
