import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { tryGetSupabaseEnv } from "./env";
import { fetchWithSupabaseTimeout } from "./fetch-with-timeout";

export interface ProxySession {
  /** Response yang sudah membawa cookie sesi ter-refresh. */
  response: NextResponse;
  /** ID user yang sedang login, atau `null` bila belum terautentikasi. */
  userId: string | null;
}

/**
 * Helper Supabase khusus Proxy (Next.js 16).
 *
 * Berbeda dengan `createSupabaseServerClient()` di `server.ts` (memakai
 * `cookies()` dari `next/headers`, hanya untuk Server Component / Server Action)
 * dan `createSupabaseBrowserClient()` di `client.ts` (browser-only), Proxy
 * berjalan SEBELUM React sehingga wajib memakai adapter cookie
 * `NextRequest` / `NextResponse`. Helper ini sekaligus me-refresh access token.
 *
 * Tidak pernah throw: bila env hilang atau jaringan Supabase tidak dapat
 * dijangkau (`fetch failed`), halaman auth (`/login`, `/register`) tetap
 * bisa dirender — proxy mengembalikan `userId: null` sebagai fallback aman.
 */
export async function getProxySession(
  request: NextRequest,
): Promise<ProxySession> {
  const response = NextResponse.next({ request });
  const env = tryGetSupabaseEnv();

  if (!env) {
    return { response, userId: null };
  }

  try {
    let mutableResponse = response;

    const supabase = createServerClient(env.url, env.anonKey, {
      global: { fetch: fetchWithSupabaseTimeout },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }

          mutableResponse = NextResponse.next({ request });

          for (const { name, value, options } of cookiesToSet) {
            mutableResponse.cookies.set(name, value, options);
          }
        },
      },
    });

    const { data, error } = await supabase.auth.getUser();

    if (error) {
      return { response: mutableResponse, userId: null };
    }

    return { response: mutableResponse, userId: data.user?.id ?? null };
  } catch {
    // Gangguan jaringan / DNS (mis. `fetch failed` ke *.supabase.co):
    // jangan crash-kan proxy — perlakukan sebagai sesi anonim.
    return { response, userId: null };
  }
}
