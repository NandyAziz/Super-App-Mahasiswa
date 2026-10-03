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
