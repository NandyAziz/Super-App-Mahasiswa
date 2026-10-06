/** Format deadline (datetime-local) menjadi label lokal siap tampil. */
export function formatProjectDeadline(deadline: string): string {
  const parsed = new Date(deadline);

  if (Number.isNaN(parsed.getTime())) {
    return deadline;
  }

  return parsed.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

interface BuildProjectDescriptionInput {
  instructions: string;
  deadline: string;
  attachmentUrl: string;
  whatsapp: string;
}

/**
 * Menggabungkan instruksi pemesan dengan metadata (deadline, kontak WhatsApp,
 * lampiran) menjadi satu kolom `description`. Kolom ini satu-satunya kanal teks
 * yang tersedia di tabel `coding_projects`, sehingga metadata dipadatkan di
 * sini agar tidak hilang.
 */
export function buildProjectDescription({
  instructions,
  deadline,
  attachmentUrl,
  whatsapp,
}: BuildProjectDescriptionInput): string {
  const meta = [
    `Deadline: ${formatProjectDeadline(deadline)}`,
    `WA: ${whatsapp.trim()}`,
  ];

  if (attachmentUrl.trim() !== "") {
    meta.push(`Lampiran: ${attachmentUrl.trim()}`);
  }

  return `${instructions.trim()}\n\n—\n${meta.join("\n")}`;
}

/** Metadata kontekstual yang dipadatkan ke dalam kolom `description`. */
export interface ProjectDescriptionMeta {
  /** Instruksi asli dari klien (bagian sebelum pemisah `—`). */
  instructions: string;
  /** Tenggat terformat, atau `null` bila baris lama tidak memilikinya. */
  deadline: string | null;
  /** Nomor WhatsApp klien, atau `null` bila tidak tercantum. */
  whatsapp: string | null;
  /** Tautan lampiran (Supabase Storage / Drive), atau `null`. */
  attachmentUrl: string | null;
}

/** Pemisah baris yang ditulis `buildProjectDescription` sebelum blok metadata. */
const META_SEPARATOR = "\n\n—\n";

/**
 * Membaca balik metadata yang dipadatkan `buildProjectDescription` ke dalam
 * field terstruktur. Dipakai kartu marketplace untuk menampilkan chip deadline
 * dan tombol WhatsApp klien tanpa menyentuh data lain.
 *
 * Baris lama yang tidak memiliki blok metadata ikut didukung: seluruh deskripsi
 * diperlakukan sebagai instruksi dan field lain bernilai `null`.
 */
export function parseProjectDescription(
  description: string,
): ProjectDescriptionMeta {
  const separatorIndex = description.indexOf(META_SEPARATOR);

  if (separatorIndex < 0) {
    return {
      instructions: description.trim(),
      deadline: null,
      whatsapp: null,
      attachmentUrl: null,
    };
  }

  const instructions = description.slice(0, separatorIndex).trim();
  const metaLines = description.slice(separatorIndex + META_SEPARATOR.length);

  let deadline: string | null = null;
  let whatsapp: string | null = null;
  let attachmentUrl: string | null = null;

  for (const line of metaLines.split("\n")) {
    if (line.startsWith("Deadline: ")) {
      deadline = line.slice("Deadline: ".length).trim() || null;
    } else if (line.startsWith("WA: ")) {
      whatsapp = line.slice("WA: ".length).trim() || null;
    } else if (line.startsWith("Lampiran: ")) {
      attachmentUrl = line.slice("Lampiran: ".length).trim() || null;
    }
  }

  return { instructions, deadline, whatsapp, attachmentUrl };
}

/**
 * Membangun tautan WhatsApp deep-link (`wa.me`) dari nomor bebas format.
 * Normalisasi meniru `whatsappSchema`: `08xx` → `628xx`, `628xx` → `628xx`.
 *
 * @returns URL `https://wa.me/…`, atau `null` bila nomor tidak valid.
 */
export function buildWhatsAppLink(raw: string): string | null {
  const compact = raw.replace(/[\s().-]/g, "");

  if (!/^(\+?62|0)8[1-9][0-9]{6,11}$/.test(compact)) {
    return null;
  }

  const normalized = compact.replace(/^\+/, "").replace(/^0/, "62");
  return `https://wa.me/${normalized}`;
}
