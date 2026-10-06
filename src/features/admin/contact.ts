/**
 * Campify — Helper kontak & dokumen pelanggan untuk dashboard operator.
 *
 * Fungsi murni (tanpa import server-only) sehingga aman dipakai di Server
 * Component (`queries.ts`) maupun Client Component (`AdminOrderCard`).
 */

/** Pola nomor WhatsApp Indonesia yang sah (meniru `whatsappSchema`). */
const WHATSAPP_PATTERN = /^(\+?62|0)8[1-9][0-9]{6,11}$/;

/**
 * Ambil nomor WhatsApp pertama dari teks bebas (`WA 0812...`, `WA: ...`).
 * Mengembalikan nomor mentah (mis. `08123456789`) atau `null`.
 */
export function extractWhatsAppNumber(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const match = value.match(/WA\s*:?\s*(\+?62\d{8,13}|0\d{8,13})/i);
  const candidate = match?.[1]?.replace(/[\s().-]/g, "") ?? null;

  if (!candidate || !WHATSAPP_PATTERN.test(candidate)) {
    return null;
  }

  return candidate;
}

/**
 * Tautan WhatsApp deep-link (`wa.me`) dari nomor bebas format.
 * `08xx` → `628xx`. `null` bila nomor tidak valid.
 */
export function buildAdminWhatsAppLink(raw: string | null | undefined): string | null {
  if (!raw) {
    return null;
  }

  const compact = raw.replace(/[\s().-]/g, "");

  if (!WHATSAPP_PATTERN.test(compact)) {
    return null;
  }

  const normalized = compact.replace(/^\+/, "").replace(/^0/, "62");
  return `https://wa.me/${normalized}`;
}

/**
 * Format nomor WhatsApp agar nyaman dibaca operator.
 * `08123456789` → `+62 812-3456-789`; `62812...` / `+62812...` dinormalkan
 * sama. Nilai tak dikenal dikembalikan apa adanya (trim).
 */
export function formatAdminPhoneDisplay(raw: string): string {
  const compact = raw.replace(/[\s().-]/g, "");
  const digits = compact.replace(/^\+/, "").replace(/^0/, "62");

  if (!/^62\d{8,13}$/.test(digits)) {
    return raw.trim();
  }

  const local = digits.slice(2);
  const head = local.slice(0, 3);
  const mid = local.slice(3, 7);
  const tail = local.slice(7);

  const grouped = [head, mid, tail].filter((part) => part.length > 0).join("-");
  return `+62 ${grouped}`;
}

/**
 * Ambil URL lampiran (`Lampiran: <url>`) dari deskripsi proyek yang
 * dipadatkan `buildProjectDescription`. `null` bila tidak ada.
 */
export function extractProjectAttachment(description: string | null | undefined): string | null {
  if (!description) {
    return null;
  }

  for (const line of description.split("\n")) {
    if (line.startsWith("Lampiran: ")) {
      const url = line.slice("Lampiran: ".length).trim();
      if (url !== "") {
        return url;
      }
    }
  }

  return null;
}

/**
 * Ambil deadline (`Deadline: ...`) dari deskripsi proyek. `null` bila tidak ada.
 */
export function extractProjectDeadline(description: string | null | undefined): string | null {
  if (!description) {
    return null;
  }

  for (const line of description.split("\n")) {
    if (line.startsWith("Deadline: ")) {
      const deadline = line.slice("Deadline: ".length).trim();
      if (deadline !== "") {
        return deadline;
      }
    }
  }

  return null;
}
