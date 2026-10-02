import { NextResponse, type NextRequest } from "next/server";
import { resolveRequestOrigin } from "@/lib/app-url";
import { getProxySession } from "@/lib/supabase/session";

const AUTH_ROUTES = ["/login", "/register", "/signup"];

/**
 * Route yang harus tetap dapat diakses TANPA sesi.
 * Callback OAuth Supabase (`/auth/callback`) wajib lolos agar `?code` dapat
 * ditukar menjadi sesi; bila ikut dijaga, user akan terlempar ke `/login`
 * sebelum sesi sempat dibuat — persis penyebab loop login OAuth.
 */
const PUBLIC_ROUTES = ["/auth/callback"];

function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function isAuthRoute(pathname: string): boolean {
  return matchesRoute(pathname, AUTH_ROUTES);
}

function isPublicRoute(pathname: string): boolean {
  return matchesRoute(pathname, PUBLIC_ROUTES);
}

/**
 * Proxy (pengganti "middleware" pada Next.js 16) yang me-refresh sesi Supabase
 * (via `getProxySession`) sekaligus memproteksi route internal: user tanpa sesi
 * dipaksa ke /login, dan user yang sudah login tidak boleh membuka
 * /login atau /register.
 *
 * Tidak pernah throw: bila Supabase tidak terjangkau (`fetch failed`) atau
 * env hilang, user diperlakukan sebagai anonim sehingga halaman auth tetap
 * dapat diakses dan halaman selain auth diarahkan ke /login.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  // Origin dinamis (NEXT_PUBLIC_APP_URL → header proxy → URL request) agar
  // redirect tetap benar di balik Netlify/CDN tanpa host hardcoded.
  const origin = resolveRequestOrigin(request);

  // Route publik (mis. callback OAuth) tidak boleh dijaga: saat `?code` ditukar
  // sesi belum ada, jadi lewati tanpa memeriksa sesi Supabase.
  if (isPublicRoute(pathname)) {
    return NextResponse.next({ request });
  }

  try {
    const { response, userId } = await getProxySession(request);

    if (!userId && !isAuthRoute(pathname)) {
      return NextResponse.redirect(new URL("/login", origin));
    }

    if (userId && isAuthRoute(pathname)) {
      return NextResponse.redirect(new URL("/", origin));
    }

    return response;
  } catch {
    if (!isAuthRoute(pathname)) {
      return NextResponse.redirect(new URL("/login", origin));
    }

    return NextResponse.next({ request });
  }
}

export const config = {
  /**
   * Jalankan pada semua route kecuali aset internal Next (`/_next`),
   * favicon, dan berkas statis (mengandung titik, mis. logo.svg).
   * Callback OAuth (`/auth/callback`) tetap masuk matcher ini namun dilewati
   * oleh `isPublicRoute` di atas.
   */
  matcher: ["/((?!_next|favicon.ico|.*[.]).*)"],
};
