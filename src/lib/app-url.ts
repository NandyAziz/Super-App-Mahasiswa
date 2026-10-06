/**
 * Utilitas penentuan origin aplikasi untuk Route Handler / Server Action /
 * Proxy. Tidak pernah memuat host hardcoded (`localhost` dsb).
 *
 * Urutan prioritas:
 *   0. Origin request bila host-nya lokal (`localhost`, `127.0.0.1`, `::1`)
 *      — selalu menang. Tanpa ini, `NEXT_PUBLIC_APP_URL` yang menunjuk ke
 *      domain produksi akan mengalahkan origin dev dan OAuth Google di
 *      `localhost` justru diarahkan balik ke domain produksi.
 *   1. `NEXT_PUBLIC_APP_URL` (mis. https://campify.example.com) bila diisi —
 *      berguna untuk kanonikalisasi domain di produksi / preview.
 *   2. Header proxy `x-forwarded-host` + `x-forwarded-proto` yang di-set
 *      Netlify/CDN sehingga redirect memakai host publik, bukan host internal.
 *   3. Origin dari URL request (mencerminkan header `Host` langsung).
 *
 * Host lokal dicocokkan tanpa port sehingga port dev (3000, 3007, dst) tetap
 * terdeteksi.
 */

/** Host yang dianggap sebagai lingkungan pengembangan lokal. */
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

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
  const requestUrl = new URL(request.url);

  // Origin lokal menang mutlak: OAuth dev harus selalu kembali ke host yang
  // dipakai user, apa pun nilai `NEXT_PUBLIC_APP_URL` di `.env.local`.
  if (LOCAL_HOSTNAMES.has(requestUrl.hostname)) {
    return requestUrl.origin;
  }

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

  return requestUrl.origin;
}
