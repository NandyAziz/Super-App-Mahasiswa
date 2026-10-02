import { getProjectCategoryLabel, getProjectDeliveryLabel } from "./options";
import type { ProjectCategory, ProjectDelivery } from "./types";

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
  category: ProjectCategory;
  deadline: string;
  attachmentUrl: string;
  whatsapp: string;
  delivery: ProjectDelivery;
}

/**
 * Menggabungkan instruksi pemesan dengan metadata (kategori, deadline, kontak
 * WhatsApp, preferensi output, lampiran) menjadi satu kolom `description`.
 * Kolom ini satu-satunya kanal teks yang tersedia di tabel `coding_projects`,
 * sehingga metadata dipadatkan di sini agar tidak hilang.
 */
export function buildProjectDescription({
  instructions,
  category,
  deadline,
  attachmentUrl,
  whatsapp,
  delivery,
}: BuildProjectDescriptionInput): string {
  const meta = [
    `Kategori: ${getProjectCategoryLabel(category)}`,
    `Deadline: ${formatProjectDeadline(deadline)}`,
    `Output: ${getProjectDeliveryLabel(delivery)}`,
    `WA: ${whatsapp.trim()}`,
  ];

  if (attachmentUrl.trim() !== "") {
    meta.push(`Lampiran: ${attachmentUrl.trim()}`);
  }

  return `${instructions.trim()}\n\n—\n${meta.join("\n")}`;
}
