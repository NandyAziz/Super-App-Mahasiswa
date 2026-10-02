import type { ProjectCategory, ProjectDelivery } from "./types";

export interface ProjectChoiceOption<T extends string> {
  value: T;
  label: string;
  description: string;
}

/** Kategori kebutuhan proyek IT & tugas. */
export const PROJECT_CATEGORY_OPTIONS: readonly ProjectChoiceOption<ProjectCategory>[] =
  [
    { value: "assignment", label: "Tugas", description: "Bantuan tugas kuliah" },
    { value: "bug_fix", label: "Bug Fix", description: "Perbaikan error kode" },
    { value: "web", label: "Web", description: "Website / landing page" },
    { value: "scripting", label: "Scripting", description: "Otomasi & skrip" },
  ];

/** Saran teknologi yang bisa dipilih cepat pada selector tech stack. */
export const TECH_STACK_SUGGESTIONS = [
  "React",
  "Next.js",
  "Node.js",
  "Laravel",
  "PHP",
  "Flutter",
  "Python",
  "MySQL",
  "Tailwind CSS",
  "Figma",
] as const;

export function getProjectCategoryLabel(category: ProjectCategory): string {
  return (
    PROJECT_CATEGORY_OPTIONS.find((option) => option.value === category)
      ?.label ?? category
  );
}

/** Preferensi output/delivery hasil pengerjaan proyek. */
export const PROJECT_DELIVERY_OPTIONS: readonly ProjectChoiceOption<ProjectDelivery>[] =
  [
    {
      value: "source_code",
      label: "Source Code",
      description: "Repo Git / ZIP kode",
    },
    {
      value: "deployment",
      label: "Deploy / Live",
      description: "Sudah online & bisa diakses",
    },
    {
      value: "documentation",
      label: "Dokumentasi",
      description: "Laporan & panduan pakai",
    },
    {
      value: "other",
      label: "Lainnya",
      description: "Sesuai diskusi",
    },
  ];

export function getProjectDeliveryLabel(delivery: ProjectDelivery): string {
  return (
    PROJECT_DELIVERY_OPTIONS.find((option) => option.value === delivery)?.label ??
    delivery
  );
}
