"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Image from "next/image";
import type { ZodError } from "zod";
import {
  CalendarClock,
  FileArchive,
  Link2,
  Loader2,
  Phone,
  Rocket,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/format";
import { TextField } from "@/components/ui/TextField";
import { TextareaField } from "@/components/ui/TextareaField";
import { createProjectAction } from "../actions";
import { startSnapPayment } from "@/features/payment/start-snap-payment";
import { buildProjectDescription } from "../metadata";
import { MIN_PROJECT_BUDGET, projectRequestSchema } from "../schemas";
import { MAX_PROJECT_UPLOAD_BYTES, uploadProjectBrief } from "../upload";
import type { ProjectActionResult } from "../types";

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
        <h3 className="text-sm font-semibold text-slate-900">
          Proyek IT &amp; Tugas
        </h3>
        <p className="text-xs text-slate-500">
          Kirim brief tugas coding, atur deadline, biar dibantu tim kampus.
        </p>
      </div>
    </div>
  );
}

export function ProjectForm({ onSuccess }: ProjectFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [instructions, setInstructions] = useState("");
  const [budget, setBudget] = useState<number>(DEFAULT_BUDGET);

  const [mode, setMode] = useState<AttachmentMode>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [link, setLink] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  function resetForm(): void {
    setFieldErrors({});
    setTitle("");
    setDeadline("");
    setInstructions("");
    setBudget(DEFAULT_BUDGET);
    setMode("upload");
    setFile(null);
    setLink("");
    setWhatsapp("");
  }

  /**
   * Validasi ulang SATU field terhadap skema saat nilainya berubah, lalu
   * perbarui `fieldErrors`. Pesan error lama (mis. "Instruksi minimal 10
   * karakter") langsung hilang begitu nilai menjadi valid — tanpa menyentuh
   * field lain sehingga tidak membanjiri form yang belum disentuh.
   */
  function revalidateField(
    key: keyof typeof projectRequestSchema.shape,
    value: unknown,
  ): void {
    const result = projectRequestSchema.shape[key].safeParse(value);
    const message = result.success ? undefined : result.error.issues[0]?.message;

    setFieldErrors((prev) => {
      const current = prev[key];
      if (current === message) return prev;
      if (message !== undefined) return { ...prev, [key]: message };
      if (current === undefined) return prev;
      return Object.fromEntries(
        Object.entries(prev).filter(([entryKey]) => entryKey !== key),
      );
    });
  }

  /** Ganti mode lampiran sambil me-reset validasi `attachment_url`. */
  function handleModeChange(next: AttachmentMode): void {
    setMode(next);
    // Mode unggah tidak memakai link ("" = tidak ada link = valid),
    // mode link memakai isi teks `link`.
    revalidateField("attachment_url", next === "link" ? link : "");
  }

  function handleBudgetChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const nextBudget =
      event.target.value === "" ? 0 : Number(event.target.value);
    setBudget(nextBudget);
    revalidateField("budget", nextBudget);
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

    // Submit → bayar tanpa langkah manual: budget selalu > 0 (min. Rp10.000)
    // sehingga Snap langsung dipicu tanpa bisa dilewati.
    const order = result.order;
    if (order && order.budget > 0) {
      void startSnapPayment(
        {
          id: order.id,
          title: order.title,
          service: "projects",
          amount: order.budget,
        },
        { onFinished: () => router.refresh() },
      );
    }
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
          whatsapp,
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
            deadline: parsed.data.deadline,
            attachmentUrl: parsed.data.attachment_url,
            whatsapp: parsed.data.whatsapp,
          }),
        );
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
          onChange={(event) => {
            setTitle(event.target.value);
            revalidateField("title", event.target.value);
          }}
          error={fieldErrors.title}
          disabled={isPending}
          required
        />

        <TextField
          id="deadline"
          name="deadline"
          type="datetime-local"
          label="Deadline"
          icon={CalendarClock}
          value={deadline}
          onChange={(event) => {
            setDeadline(event.target.value);
            revalidateField("deadline", event.target.value);
          }}
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
          value={instructions}
          onChange={(event) => {
            setInstructions(event.target.value);
            revalidateField("instructions", event.target.value);
          }}
          error={fieldErrors.instructions}
          disabled={isPending}
          required
        />
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-1.5">
          <FileArchive className="h-4 w-4 text-indigo-500" />
          <span className="text-xs font-medium text-slate-600">
            Upload Dokumen Tugas
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
          {ATTACHMENT_TABS.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => handleModeChange(tab.value)}
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
            onChange={(event) => {
              setLink(event.target.value);
              revalidateField("attachment_url", event.target.value);
            }}
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
          onChange={(event) => {
            setWhatsapp(event.target.value);
            revalidateField("whatsapp", event.target.value);
          }}
          error={fieldErrors.whatsapp}
          hint="Wajib diisi untuk koordinasi teknis & konfirmasi pengerjaan"
          disabled={isPending}
          required
        />

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
              onClick={() => {
                setBudget(preset);
                revalidateField("budget", preset);
              }}
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

