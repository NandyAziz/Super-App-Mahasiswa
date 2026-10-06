import {
  FileCheck2,
  LayoutTemplate,
  ScrollText,
  SpellCheck,
  type LucideIcon,
} from "lucide-react";
import type { AcademicRequestType, AcademicServiceType } from "./types";

export interface AcademicRequestTypeOption {
  value: AcademicRequestType;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Nilai `service_type` yang kompatibel dengan database. */
  serviceType: AcademicServiceType;
}

/**
 * Pilihan jenis bantuan akademik pada form. Setiap opsi memetakan ke nilai
 * `service_type` yang dikenal database agar pengajuan dapat disimpan.
 */
export const ACADEMIC_REQUEST_TYPE_OPTIONS: readonly AcademicRequestTypeOption[] =
  [
    {
      value: "proofreading",
      label: "Proofreading",
      description: "Ejaan, tata bahasa & format",
      icon: SpellCheck,
      serviceType: "proofreading",
    },
    {
      value: "layout_citation",
      label: "Layout & Citation",
      description: "Penataan halaman & sitasi",
      icon: LayoutTemplate,
      serviceType: "proofreading",
    },
    {
      value: "turnitin_check",
      label: "Turnitin Check",
      description: "Cek similarity & plagiarisme",
      icon: FileCheck2,
      serviceType: "proofreading",
    },
    {
      value: "report_guidance",
      label: "Report Guidance",
      description: "Bimbingan penulisan laporan",
      icon: ScrollText,
      serviceType: "report_assistance",
    },
  ];

const DEFAULT_REQUEST_TYPE_OPTION = ACADEMIC_REQUEST_TYPE_OPTIONS[0];

/** Aman walau nilai di luar yang dikenal UI. */
export function getAcademicRequestTypeMeta(
  value: AcademicRequestType,
): AcademicRequestTypeOption {
  return (
    ACADEMIC_REQUEST_TYPE_OPTIONS.find((option) => option.value === value) ??
    DEFAULT_REQUEST_TYPE_OPTION
  );
}

/** Format deadline (datetime-local) menjadi label lokal siap tampil. */
export function formatAcademicDeadline(deadline: string): string {
  const parsed = new Date(deadline);

  if (Number.isNaN(parsed.getTime())) {
    return deadline;
  }

  return parsed.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

interface BuildAcademicNotesInput {
  requestType: AcademicRequestType;
  deadline: string;
  rubricUrl: string;
  whatsapp: string;
  instructions: string;
}

/**
 * Memadatkan metadata pengajuan (jenis layanan, deadline, kontak WhatsApp,
 * instruksi khusus, link instruksi/rubrik dosen) ke kolom `notes`. Kolom ini
 * dipakai karena tabel `academic_services` hanya menyediakan satu `document_url`
 * (untuk draft).
 */
export function buildAcademicNotes({
  requestType,
  deadline,
  rubricUrl,
  whatsapp,
  instructions,
}: BuildAcademicNotesInput): string {
  return [
    `Layanan: ${getAcademicRequestTypeMeta(requestType).label}`,
    `Deadline: ${formatAcademicDeadline(deadline)}`,
    `WA: ${whatsapp.trim()}`,
    `Instruksi: ${instructions.trim()}`,
    `Instruksi/Rubrik Dosen: ${rubricUrl.trim()}`,
  ].join("\n");
}

export interface ParsedAcademicNotes {
  layanan: string;
  deadline: string;
  whatsapp: string;
  instructions: string;
  rubricUrl: string;
}

const EMPTY_ACADEMIC_NOTES: ParsedAcademicNotes = {
  layanan: "",
  deadline: "",
  whatsapp: "",
  instructions: "",
  rubricUrl: "",
};

/**
 * Kebalikan dari `buildAcademicNotes`: memecah string `notes` yang dipadatkan
 * menjadi field terstruktur sehingga kartu riwayat tidak perlu merender blob
 * teks mentah. Aman untuk notes lama/kosong (semua field menjadi "").
 *
 * Baris lanjutan tanpa prefix yang dikenal (mis. instruksi multi-baris)
 * digabungkan ke field yang sedang aktif. `Instruksi/Rubrik Dosen:` dicek
 * sebelum `Instruksi:` agar tidak tertangkap oleh prefix yang lebih pendek.
 */
export function parseAcademicNotes(notes: string | null): ParsedAcademicNotes {
  if (!notes) {
    return { ...EMPTY_ACADEMIC_NOTES };
  }

  const parsed: ParsedAcademicNotes = { ...EMPTY_ACADEMIC_NOTES };
  const prefixes: readonly [string, keyof ParsedAcademicNotes][] = [
    ["Layanan:", "layanan"],
    ["Deadline:", "deadline"],
    ["WA:", "whatsapp"],
    ["Instruksi/Rubrik Dosen:", "rubricUrl"],
    ["Instruksi:", "instructions"],
  ];

  let current: keyof ParsedAcademicNotes | null = null;

  for (const line of notes.split(/\r?\n/)) {
    const matched = prefixes.find(([prefix]) => line.startsWith(prefix));

    if (matched) {
      const [prefix, key] = matched;
      current = key;
      parsed[key] = line.slice(prefix.length).trim();
      continue;
    }

    if (current && line.trim() !== "") {
      parsed[current] = parsed[current]
        ? `${parsed[current]}\n${line.trim()}`
        : line.trim();
    }
  }

  return parsed;
}
