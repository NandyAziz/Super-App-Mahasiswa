import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";
import { fetchWithSupabaseTimeout } from "./fetch-with-timeout";

type ServerSupabaseClient = ReturnType<typeof createServerClient>;

interface ServerClientOptions {
  /**
   * `false` membuat cookie sesi menjadi *session cookie* (tanpa `maxAge` /
   * `expires`) sehingga terhapus saat browser ditutup — inilah arti praktis
   * dari checkbox "Keep me signed in" yang TIDAK dicentang.
   *
   * CATATAN: bersifat best-effort. Bila Supabase nanti me-refresh token pada
   * request berikutnya (lewat proxy), cookie ditulis ulang oleh `setAll` milik
   * proxy dengan masa berlaku default library. Untuk keluar sepenuhnya, pakai
   * tombol keluar.
   *
   * @default true
   */
  persistSession?: boolean;
}

/**
 * Supabase client untuk Server Component / Server Action / Route Handler.
 * `cookies()` bersifat async pada Next.js 16 sehingga wajib di-await.
 *
 * Seluruh request jaringan dibatasi timeout 5 detik via `global.fetch`
 * agar tidak menggantung 10+ detik di jaringan lambat.
 */
export async function createSupabaseServerClient({
  persistSession = true,
}: ServerClientOptions = {}): Promise<ServerSupabaseClient> {
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
            if (persistSession) {
              cookieStore.set(name, value, options);
              continue;
            }

            // Buang masa berlaku → cookie menjadi session cookie.
            const sessionOptions = { ...options };
            delete sessionOptions.maxAge;
            delete sessionOptions.expires;

            cookieStore.set(name, value, sessionOptions);
          }
        } catch {
          // Dipanggil dari Server Component (read-only). Aman diabaikan;
          // refresh session ditangani oleh middleware.
        }
      },
    },
  });
}
