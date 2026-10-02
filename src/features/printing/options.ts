import type {
  BindingType,
  PrintFinishing,
  PrintPaperSize,
  PrintSide,
} from "./types";

export interface PrintChoiceOption<T extends string> {
  value: T;
  label: string;
  description: string;
}

/** Pilihan warna / jenis cetak (selaras dengan `PRINT_TYPE_OPTIONS`). */
export const PRINT_PAPER_SIZE_OPTIONS: readonly PrintChoiceOption<PrintPaperSize>[] =
  [
    { value: "a4", label: "A4", description: "210 × 297 mm" },
    { value: "f4", label: "F4", description: "215 × 330 mm" },
  ];

export const PRINT_SIDE_OPTIONS: readonly PrintChoiceOption<PrintSide>[] = [
  { value: "single", label: "Single", description: "Cetak 1 sisi" },
  { value: "duplex", label: "Duplex", description: "Cetak 2 sisi" },
];

export const PRINT_FINISHING_OPTIONS: readonly PrintChoiceOption<PrintFinishing>[] =
  [
    { value: "none", label: "None", description: "Tanpa finishing" },
    { value: "staples", label: "Staples", description: "Disatukan staples" },
    { value: "lakban", label: "Lakban", description: "Jilid lakban" },
    { value: "spiral", label: "Spiral", description: "Jilid spiral" },
  ];

/**
 * Pemetaan finishing ke kolom `binding_type` yang tersedia di database.
 * `none` & `staples` memakai binding tanpa biaya, `lakban` → soft cover,
 * `spiral` → hard cover.
 */
export const FINISHING_TO_BINDING: Record<PrintFinishing, BindingType> = {
  none: "none",
  staples: "none",
  lakban: "soft",
  spiral: "hard",
};

export function getFinishingLabel(finishing: PrintFinishing): string {
  return (
    PRINT_FINISHING_OPTIONS.find((option) => option.value === finishing)
      ?.label ?? finishing
  );
}
