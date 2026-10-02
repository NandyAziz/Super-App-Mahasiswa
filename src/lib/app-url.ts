/**
 * Utilitas penentuan origin aplikasi untuk Route Handler / Server Action /
 * Proxy. Tidak pernah memuat host hardcoded (`localhost` dsb).
 *
 * Urutan prioritas:
 *   1. `NEXT_PUBLIC_APP_URL` (mis. https://campify.example.com) bila diisi —
 *      berguna untuk kanonikalisasi domain di produksi / preview.
 *   2. Header proxy `x-forwarded-host` + `x-forwarded-proto` yang di-set
 *      Netlify/CDN sehingga redirect memakai host publik, bukan host internal.
 *   3. Origin dari URL request (mencerminkan header `Host` langsung) — mis.
 *      http://localhost:3000 saat pengembangan.
 */

/** Ambil nilai pertama bila header berupa daftar dipisah koma. */
function firstHeaderValue(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const first = value.split(",")[0]?.trim();
  return first && first.length > 0 ? first : null;
}

/** Origin publik aplikasi dari sebuah `Request`/`NextRequest`. */
export function resolveRequestOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  const forwardedHost = firstHeaderValue(
    request.headers.get("x-forwarded-host"),
  );
  const forwardedProto = firstHeaderValue(
    request.headers.get("x-forwarded-proto"),
  );

  if (forwardedHost && forwardedProto) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
}
