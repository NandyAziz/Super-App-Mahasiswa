import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_REDIRECT_PATH } from "@/features/auth/constants";
import { ensureUserProfile } from "@/features/profile/ensure";
import { resolveRequestOrigin } from "@/lib/app-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Hanya izinkan path internal agar tidak terjadi open redirect. */
function resolveNext(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }

  return DEFAULT_REDIRECT_PATH;
}

/** Alihkan kembali ke /login dengan penanda error OAuth yang ramah. */
function oauthFailure(origin: string): NextResponse {
  return NextResponse.redirect(new URL("/login?error=oauth", origin));
}

/**
 * Callback OAuth Supabase (PKCE).
 *
 * Supabase mengalihkan kembali ke sini dengan `?code`. Kode ditukar menjadi
 * sesi Supabase (cookie ditulis oleh `createSupabaseServerClient`), lalu user
 * diarahkan ke `?next` (default dashboard `/`). Bila kode tidak ada / gagal
 * ditukar, user dikembalikan ke `/login?error=oauth` agar form menampilkan
 * pesan error yang jelas alih-alih memutar balik tanpa penjelasan.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = resolveNext(searchParams.get("next"));
  // Origin dinamis: NEXT_PUBLIC_APP_URL → header proxy → URL request.
  const origin = resolveRequestOrigin(request);

  if (!code) {
    return oauthFailure(origin);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      return oauthFailure(origin);
    }

    // Best-effort: pastikan baris `public.profiles` ada sehingga INSERT ke
    // tabel pesanan tidak gagal karena foreign key. Kegagalan tidak menghalangi
    // login (profil juga disiapkan lazy oleh Server Action terkait).
    await ensureUserProfile(supabase, data.user);

    return NextResponse.redirect(new URL(next, origin));
  } catch {
    return oauthFailure(origin);
  }
}
