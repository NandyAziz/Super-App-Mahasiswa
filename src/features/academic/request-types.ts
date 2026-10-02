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
