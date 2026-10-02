"use client";

import { createBrowserClient } from "@supabase/ssr";
import { tryGetSupabaseEnv } from "./env";
import { fetchWithSupabaseTimeout } from "./fetch-with-timeout";

type BrowserSupabaseClient = ReturnType<typeof createBrowserClient>;

let cachedClient: BrowserSupabaseClient | null = null;

/**
 * Supabase client untuk Client Component (browser).
 * Di-cache sebagai singleton agar tidak membuat koneksi berulang.
 * Throw error yang jelas bila env hilang sehingga dapat ditangkap
 * oleh error boundary / toast di sisi client.
 *
 * Seluruh request jaringan dibatasi timeout 5 detik via `global.fetch`
 * agar tidak menggantung 10+ detik di jaringan lambat.
 */
export function createSupabaseBrowserClient(): BrowserSupabaseClient {
  if (cachedClient) {
    return cachedClient;
  }

  const env = tryGetSupabaseEnv();

  if (!env) {
    throw new Error(
      "Konfigurasi Supabase belum tersedia. Hubungi admin kampus.",
    );
  }

  cachedClient = createBrowserClient(env.url, env.anonKey, {
    global: { fetch: fetchWithSupabaseTimeout },
  });

  return cachedClient;
}

/** True bila browser client dapat dibuat (env tersedia). */
export function isSupabaseBrowserConfigured(): boolean {
  return tryGetSupabaseEnv() !== null;
}
