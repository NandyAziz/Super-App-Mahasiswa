import {
  BookOpenCheck,
  ChartColumn,
  SpellCheck,
  type LucideIcon,
} from "lucide-react";
import type { AcademicServiceType } from "./types";

export interface AcademicServiceTypeMeta {
  value: AcademicServiceType;
  label: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
}

const SERVICE_TYPE_META: Record<string, AcademicServiceTypeMeta> = {
  proofreading: {
    value: "proofreading",
    label: "Proofreading Makalah",
    description: "Perbaikan ejaan, tata bahasa & format",
    icon: SpellCheck,
    gradient: "from-indigo-500 to-violet-600",
  },
  data_analysis: {
    value: "data_analysis",
    label: "Analisis Data",
    description: "Bantuan olah data & statistik",
    icon: ChartColumn,
    gradient: "from-blue-500 to-indigo-600",
  },
  report_assistance: {
    value: "report_assistance",
    label: "Pendampingan Laporan",
    description: "Bimbingan penulisan laporan & skripsi",
    icon: BookOpenCheck,
    gradient: "from-fuchsia-500 to-violet-600",
  },
};

export const ACADEMIC_SERVICE_TYPE_OPTIONS: readonly AcademicServiceTypeMeta[] =
  [
    SERVICE_TYPE_META.proofreading,
    SERVICE_TYPE_META.data_analysis,
    SERVICE_TYPE_META.report_assistance,
  ];

/** Aman walau database mengembalikan tipe di luar yang dikenal UI. */
export function getAcademicServiceTypeMeta(
  type: AcademicServiceType,
): AcademicServiceTypeMeta {
  return SERVICE_TYPE_META[type] ?? SERVICE_TYPE_META.proofreading;
}
