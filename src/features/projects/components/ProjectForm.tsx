"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Image from "next/image";
import type { ZodError } from "zod";
import {
  CalendarClock,
  Code2,
  FileArchive,
  Link2,
  Loader2,
  PackageCheck,
  Phone,
  Plus,
  Rocket,
  Tag,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/format";
import { TextField } from "@/components/ui/TextField";
import { TextareaField } from "@/components/ui/TextareaField";
import { createProjectAction } from "../actions";
import { buildProjectDescription } from "../metadata";
import {
  PROJECT_CATEGORY_OPTIONS,
  PROJECT_DELIVERY_OPTIONS,
  TECH_STACK_SUGGESTIONS,
} from "../options";
import { MIN_PROJECT_BUDGET, projectRequestSchema } from "../schemas";
import { MAX_PROJECT_UPLOAD_BYTES, uploadProjectBrief } from "../upload";
import type {
  ProjectActionResult,
  ProjectCategory,
  ProjectDelivery,
} from "../types";

interface ProjectFormProps {
  /** Dipanggil setelah proyek berhasil dipublikasikan. */
  onSuccess?: () => void;
}

type AttachmentMode = "upload" | "link";

const BUDGET_PRESETS = [50000, 150000, 500000] as const;
const DEFAULT_BUDGET = 50000;

const ATTACHMENT_TABS: readonly {
  value: AttachmentMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: "upload", label: "Upload Brief/ZIP", icon: FileArchive },
  { value: "link", label: "Drive / GitHub / Figma", icon: Link2 },
];

function toFieldErrors(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }

  return fieldErrors;
}

/** Header bento dengan maskot coding sebagai ilustrasi hero. */
function ProjectHero() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-linear-to-br from-indigo-50 to-white p-3.5">
      <Image
        src="/images/mascot/bear-coding.png"
        alt="Maskot Proyek IT"
        width={96}
        height={96}
        priority
        className="h-16 w-16 shrink-0 object-contain drop-shadow-md"
      />
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-slate-900">Proyek IT &amp; Tugas</h3>
        <p className="text-xs text-slate-500">
          Kirim brief tugas coding, atur deadline, biar dibantu tim kampus.
        </p>
      </div>
    </div>
  );
}

interface CategoryPillsProps {
  value: ProjectCategory;
  disabled?: boolean;
  onChange: (value: ProjectCategory) => void;
}

/** Selector kategori berbentuk pill 2 kolom. */
function CategoryPills({ value, disabled, onChange }: CategoryPillsProps) {
  return (
    <div className="space-y-1.5">
      <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
        <Tag className="h-3.5 w-3.5 text-indigo-500" />
        Kategori
      </span>
      <div className="grid grid-cols-2 gap-2">
        {PROJECT_CATEGORY_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            disabled={disabled}
            aria-pressed={value === option.value}
            className={cn(
              "rounded-xl border p-2.5 text-left transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60",
              value === option.value
                ? "border-indigo-400 bg-indigo-50 ring-2 ring-indigo-200/60"
                : "border-slate-200 bg-white",
            )}
          >
            <span className="block text-xs font-semibold text-slate-900">
              {option.label}
            </span>
            <span className="block text-[0.65rem] text-slate-500">
              {option.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

interface DeliveryPillsProps {
  value: ProjectDelivery;
  disabled?: boolean;
  onChange: (value: ProjectDelivery) => void;
}

/** Selector preferensi output/delivery berbentuk pill 2 kolom. */
function DeliveryPills({ value, disabled, onChange }: DeliveryPillsProps) {
  return (
    <div className="space-y-1.5">
      <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
        <PackageCheck className="h-3.5 w-3.5 text-indigo-500" />
        Output / Delivery
      </span>
      <div className="grid grid-cols-2 gap-2">
        {PROJECT_DELIVERY_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            disabled={disabled}
            aria-pressed={value === option.value}
            className={cn(
              "rounded-xl border p-2.5 text-left transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60",
              value === option.value
                ? "border-indigo-400 bg-indigo-50 ring-2 ring-indigo-200/60"
                : "border-slate-200 bg-white",
            )}
          >
            <span className="block text-xs font-semibold text-slate-900">
              {option.label}
            </span>
            <span className="block text-[0.65rem] text-slate-500">
              {option.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ProjectForm({ onSuccess }: ProjectFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ProjectCategory>("assignment");
  const [techStack, setTechStack] = useState<string[]>([]);
  const [customTech, setCustomTech] = useState("");
  const [deadline, setDeadline] = useState("");
  const [instructions, setInstructions] = useState("");
  const [budget, setBudget] = useState<number>(DEFAULT_BUDGET);

  const [mode, setMode] = useState<AttachmentMode>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [link, setLink] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [delivery, setDelivery] = useState<ProjectDelivery>("source_code");

  function toggleTech(tech: string): void {
    setTechStack((current) =>
      current.some((item) => item.toLowerCase() === tech.toLowerCase())
        ? current.filter((item) => item.toLowerCase() !== tech.toLowerCase())
        : [...current, tech],
    );
  }

  function addCustomTech(): void {
    const value = customTech.trim();
    if (value === "") {
      return;
    }

    setTechStack((current) =>
      current.some((item) => item.toLowerCase() === value.toLowerCase())
        ? current
        : [...current, value],
    );
    setCustomTech("");
  }

  function resetForm(): void {
    setFieldErrors({});
    setTitle("");
    setCategory("assignment");
    setTechStack([]);
    setCustomTech("");
    setDeadline("");
    setInstructions("");
    setBudget(DEFAULT_BUDGET);
    setMode("upload");
    setFile(null);
    setLink("");
    setWhatsapp("");
    setDelivery("source_code");
  }

  function handleBudgetChange(event: React.ChangeEvent<HTMLInputElement>): void {
    setBudget(event.target.value === "" ? 0 : Number(event.target.value));
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>): void {
    setFile(event.target.files?.[0] ?? null);
  }

  async function resolveAttachmentUrl(): Promise<string | null> {
    if (mode === "link") {
      return link.trim() === "" ? null : link.trim();
    }

    if (!file) {
      return null;
    }

    if (file.size > MAX_PROJECT_UPLOAD_BYTES) {
      toast.error(
        "Ukuran berkas melebihi 25 MB. Gunakan link Google Drive / GitHub / Figma.",
      );
      return null;
    }

    return uploadProjectBrief(file);
  }

  function applyResult(result: ProjectActionResult): void {
    if (result.status === "error") {
      setFieldErrors(result.fieldErrors ?? {});
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
    resetForm();
    onSuccess?.();
    router.refresh();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFieldErrors({});

    startTransition(async () => {
      try {
        const attachmentUrl = await resolveAttachmentUrl();

        if (attachmentUrl === null) {
          toast.error(
            mode === "upload"
              ? "Unggah brief/ZIP proyek terlebih dahulu."
              : "Isi link Google Drive / GitHub / Figma.",
          );
          return;
        }

        const parsed = projectRequestSchema.safeParse({
          title,
          category,
          tech_stack: techStack.join(", "),
          whatsapp,
          delivery_preference: delivery,
          instructions,
          deadline,
          attachment_url: attachmentUrl,
          budget,
        });

        if (!parsed.success) {
          setFieldErrors(toFieldErrors(parsed.error));
          toast.error("Periksa kembali detail proyek Anda.");
          return;
        }

        const formData = new FormData();
        formData.set("title", parsed.data.title);
        formData.set(
          "description",
          buildProjectDescription({
            instructions: parsed.data.instructions,
            category: parsed.data.category,
            deadline: parsed.data.deadline,
            attachmentUrl: parsed.data.attachment_url,
            whatsapp: parsed.data.whatsapp,
            delivery: parsed.data.delivery_preference,
          }),
        );
        formData.set("tech_stack", parsed.data.tech_stack.join(", "));
        formData.set("budget", String(parsed.data.budget));

        applyResult(await createProjectAction(formData));
      } catch (cause) {
        toast.error(
          cause instanceof Error
            ? cause.message
            : "Gagal mempublikasikan proyek. Silakan coba lagi.",
        );
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <ProjectHero />

      <section className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <TextField
          id="title"
          name="title"
          label="Judul Proyek"
          placeholder="Landing Page Himpunan"
          icon={Rocket}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          error={fieldErrors.title}
          disabled={isPending}
          required
        />

        <CategoryPills
          value={category}
          disabled={isPending}
          onChange={setCategory}
        />


        <div className="space-y-2">
          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <Code2 className="h-3.5 w-3.5 text-indigo-500" />
            Tech Stack
          </span>

          <div className="flex gap-2">
            <input
              id="custom_tech"
              type="text"
              value={customTech}
              onChange={(event) => setCustomTech(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addCustomTech();
                }
              }}
              placeholder="Tambah teknologi lain (mis. Go, Django)"
              disabled={isPending}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-all duration-150 placeholder:text-slate-400 focus:border-transparent focus:ring-2 focus:ring-indigo-600 disabled:opacity-60"
            />
            <button
              type="button"
              onClick={addCustomTech}
              disabled={isPending}
              aria-label="Tambah teknologi"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {TECH_STACK_SUGGESTIONS.map((tech) => {
              const selected = techStack.some(
                (item) => item.toLowerCase() === tech.toLowerCase(),
              );
              return (
                <button
                  key={tech}
                  type="button"
                  onClick={() => toggleTech(tech)}
                  disabled={isPending}
                  aria-pressed={selected}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[0.7rem] font-medium transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60",
                    selected
                      ? "border-indigo-300 bg-indigo-50 text-indigo-600"
                      : "border-slate-200 bg-white text-slate-500",
                  )}
                >
                  {tech}
                </button>
              );
            })}
          </div>

          {techStack.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {techStack.map((tech) => (
                <span
                  key={tech}
                  className="inline-flex items-center gap-1 rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[0.7rem] font-medium text-indigo-600"
                >
                  {tech}
                  <button
                    type="button"
                    onClick={() => toggleTech(tech)}
                    disabled={isPending}
                    aria-label={`Hapus ${tech}`}
                    className="text-indigo-400 transition-colors hover:text-indigo-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          {fieldErrors.tech_stack ? (
            <p className="text-[0.7rem] font-medium text-red-500">
              {fieldErrors.tech_stack}
            </p>
          ) : null}
        </div>

        <TextField
          id="deadline"
          name="deadline"
          type="datetime-local"
          label="Deadline"
          icon={CalendarClock}
          value={deadline}
          onChange={(event) => setDeadline(event.target.value)}
          error={fieldErrors.deadline}
          disabled={isPending}
          required
        />

        <TextareaField
          id="instructions"
          name="instructions"
          rows={4}
          label="Instruksi"
          placeholder="Jelaskan detail tugas, fitur, referensi, atau error yang ditemukan..."
          error={fieldErrors.instructions}
          disabled={isPending}
          required
        />
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <TextField
          id="whatsapp"
          name="whatsapp"
          type="tel"
          inputMode="tel"
          label="Nomor WhatsApp Aktif"
          placeholder="08123456789"
          icon={Phone}
          value={whatsapp}
          onChange={(event) => setWhatsapp(event.target.value)}
          error={fieldErrors.whatsapp}
          hint="Wajib diisi untuk koordinasi teknis & konfirmasi pengerjaan"
          disabled={isPending}
          required
        />

        <DeliveryPills
          value={delivery}
          disabled={isPending}
          onChange={setDelivery}
        />
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-1.5">
          <FileArchive className="h-4 w-4 text-indigo-500" />
          <span className="text-xs font-medium text-slate-600">
            Lampiran Brief
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
          {ATTACHMENT_TABS.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setMode(tab.value)}
                aria-pressed={mode === tab.value}
                disabled={isPending}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[0.7rem] font-semibold transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60",
                  mode === tab.value
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700",
                )}
              >
                <TabIcon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {mode === "upload" ? (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-5 text-center transition-colors hover:border-indigo-300">
            <Upload className="h-5 w-5 text-indigo-500" />
            <span className="text-xs font-semibold text-slate-700">
              {file ? file.name : "Pilih brief / ZIP proyek"}
            </span>
            <span className="text-[0.65rem] text-slate-400">
              {file
                ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
                : "PDF, DOCX, ZIP · maks 25 MB"}
            </span>
            <input
              type="file"
              className="sr-only"
              accept=".pdf,.doc,.docx,.zip,.rar,.txt,.png,.jpg,.jpeg"
              onChange={handleFileChange}
              disabled={isPending}
            />
          </label>
        ) : (
          <TextField
            id="attachment_url"
            name="attachment_url"
            type="url"
            label="Link Brief"
            placeholder="https://drive.google.com / github.com / figma.com"
            icon={Link2}
            value={link}
            onChange={(event) => setLink(event.target.value)}
            error={fieldErrors.attachment_url}
            disabled={isPending}
            hint="Google Drive, GitHub, atau Figma"
          />
        )}

        <p className="text-[0.65rem] leading-relaxed text-slate-400">
          Brief berbentuk ZIP atau beberapa berkas? Gunakan link Google Drive /
          GitHub / Figma agar mudah diakses.
        </p>
      </section>

      <section className="space-y-2 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <TextField
          id="budget"
          name="budget"
          type="number"
          inputMode="numeric"
          min={MIN_PROJECT_BUDGET}
          step={10000}
          label="Budget"
          prefix="Rp"
          value={budget}
          onChange={handleBudgetChange}
          error={fieldErrors.budget}
          disabled={isPending}
          required
        />

        <div className="flex flex-wrap gap-2">
          {BUDGET_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setBudget(preset)}
              disabled={isPending}
              className={cn(
                "rounded-full border px-3 py-1 text-[0.7rem] font-medium transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60",
                budget === preset
                  ? "border-indigo-300 bg-indigo-50 text-indigo-600"
                  : "border-slate-200 bg-white text-slate-500",
              )}
            >
              {formatRupiah(preset)}
            </button>
          ))}
        </div>
      </section>

      <button
        type="submit"
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Rocket className="h-4 w-4" />
        )}
        <span>{isPending ? "Mengirim..." : "Kirim Proyek"}</span>
      </button>
    </form>
  );
}


