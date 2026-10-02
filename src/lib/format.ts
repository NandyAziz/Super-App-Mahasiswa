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

/** Label pendek dari sebuah URL: nama berkas terakhir, atau hostname. */
export function getUrlLabel(url: string): string {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const lastSegment = segments.at(-1);

    return lastSegment ? decodeURIComponent(lastSegment) : parsed.hostname;
  } catch {
    return url;
  }
}

