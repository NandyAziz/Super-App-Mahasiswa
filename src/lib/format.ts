const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeZone: "UTC",
});

/** Format angka menjadi "Rp12.000" (tanpa desimal). */
export function formatRupiah(value: number): string {
  return rupiahFormatter.format(value);
}

/**
 * Label waktu relatif bahasa Indonesia ("2 jam lalu").
 * `now` dapat di-inject agar hasilnya deterministik saat di-render di server.
 */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return "-";
  }

  const minutes = Math.floor((now.getTime() - then) / 60000);
  if (minutes < 1) {
    return "Baru saja";
  }
  if (minutes < 60) {
    return `${minutes} menit lalu`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} jam lalu`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days} hari lalu`;
  }

  return dateFormatter.format(new Date(iso));
}

/**
 * Prefix kode pesanan per layanan, dipakai untuk kode ringkas yang mudah
 * dibaca (& diketik ke WhatsApp) alih-alih UUID database yang panjang.
 */
const ORDER_CODE_PREFIX: Record<string, string> = {
  jastip: "JST",
  printing: "PRT",
  projects: "PRJ",
  tutoring: "TUT",
  academic: "AKD",
};

/**
 * Kode pesanan ringkas, mis. `#PRT-A1B2C3`.
 *
 * Diambil dari 6 karakter pertama UUID agar stabil, unik, dan tidak
 * membocorkan identifier database utuh ke UI pengguna.
 */
export function formatOrderCode(service: string, id: string): string {
  const prefix = ORDER_CODE_PREFIX[service] ?? "ORD";
  const hex = id.replace(/[^0-9a-f]/gi, "").slice(0, 6).toUpperCase();
  return `#${prefix}-${hex || "000000"}`;
}

/**
 * Prefix yang ditambahkan helper unggah berkas (`${Date.now()}-${uuid}-nama`).
 * Diawali epoch-millis lalu UUID, sehingga memunculkan "1791096171127-c85ab226…"
 * di UI. Pola ini dibuang agar hanya nama berkas asli yang tampil.
 */
const STORAGE_KEY_PREFIX_PATTERN =
  /^\d{10,}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i;

/** Nama berkas yang aman & ringkas dari sebuah segmen URL. */
function readableFileName(raw: string): string {
  let name = raw;

  try {
    name = decodeURIComponent(name);
  } catch {
    // URL tidak ter-decode (mis. karakter `%` salah) — pakai bentuk mentah.
  }

  name = name.replace(STORAGE_KEY_PREFIX_PATTERN, "").trim();

  return name.length > 0 ? name : "";
}

/**
 * True bila segmen URL dianggap nama berkas sungguhan — yaitu punya ekstensi
 * (titik). Tanpa picky ini, URL seperti `drive.google.com/file/d/<id>/view`
 * akan menampilkan kata "view"/"edit" sebagai judul.
 */
function looksLikeFileName(segment: string): boolean {
  const dot = segment.lastIndexOf(".");
  return dot > 0 && dot < segment.length - 1;
}

/**
 * Path URL objek publik Supabase Storage. Hanya URL bentuk ini yang mendukung
 * parameter `?download=` — sumber lain (Drive, link luar) tetap dibuka lewat
 * preview karena `download` lintas origin diabaikan browser.
 */
const SUPABASE_PUBLIC_OBJECT_PATTERN = /\/storage\/v1\/object\/public\//;

/**
 * URL yang memaksa berkas diunduh, bukan sekadar dibuka di tab preview.
 *
 * Untuk Supabase Storage publik, `?download=<nama>` membuat browser/CI
 * mengunduh dengan nama tersebut. Nama berkas dibersihkan dari prefix acak
 * (lihat `getUrlLabel`) agar pengguna menerima `Skripsi.pdf`, bukan
 * `1791096171127-c85ab226-…-Skripsi.pdf`.
 *
 * URL non-Supabase dikembalikan apa adanya (tidak ada yang bisa dipaksa).
 */
export function buildDocumentDownloadUrl(
  url: string,
  fileName?: string,
): string {
  const safeName = (fileName ?? "").trim();

  try {
    const parsed = new URL(url);

    if (!SUPABASE_PUBLIC_OBJECT_PATTERN.test(parsed.pathname)) {
      return url;
    }

    parsed.searchParams.set("download", safeName);
    return parsed.toString();
  } catch {
    return url;
  }
}

/** Nama berkas untuk atribut `download` pada elemen <a>. */
export function getDownloadFileName(url: string): string {
  return getUrlLabel(url);
}

/**
 * Label ramah dari URL berkas: nama berkas saja (tanpa prefix acak), bukan
 * URL mentah maupun UUID.
 *
 * Fallback berurutan: nama berkas → nama host (mis. Google Drive). Dipakai
 * untuk judul pesanan cetak/akademik pada `/orders` dan `/printing`.
 */
export function getUrlLabel(url: string): string {
  try {
    const parsed = new URL(url);
    const lastSegment = parsed.pathname.split("/").filter(Boolean).at(-1);
    const fileName = lastSegment ? readableFileName(lastSegment) : "";

    if (fileName && looksLikeFileName(fileName)) {
      return fileName;
    }

    // Tanpa nama berkas di path (mis. link Drive) → pakai nama host.
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    // Bukan URL absolut — tetap bersihkan bila terlihat seperti nama berkas.
    const fallback = readableFileName(url);
    return looksLikeFileName(fallback) ? fallback : url;
  }
}

