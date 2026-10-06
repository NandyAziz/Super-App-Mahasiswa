"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Image from "next/image";
import type { ZodError } from "zod";
import {
  CalendarClock,
  ClipboardList,
  FileText,
  Link2,
  Loader2,
  MessageSquare,
  Phone,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TextareaField } from "@/components/ui/TextareaField";
import { TextField } from "@/components/ui/TextField";
import { createAcademicServiceAction } from "../actions";
import {
  ACADEMIC_REQUEST_TYPE_OPTIONS,
  buildAcademicNotes,
} from "../request-types";
import { academicRequestSchema } from "../schemas";
import { MAX_ACADEMIC_UPLOAD_BYTES, uploadAcademicDocument } from "../upload";
import type { AcademicActionResult, AcademicRequestType } from "../types";

interface AcademicFormProps {
  /** Dipanggil setelah pengajuan berhasil dibuat. */
  onSuccess?: () => void;
}

type AttachmentMode = "upload" | "link";

const ATTACHMENT_TABS: readonly {
  value: AttachmentMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: "upload", label: "Upload File", icon: Upload },
  { value: "link", label: "Drive Link", icon: Link2 },
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

/** Header bento dengan maskot sebagai ilustrasi hero. */
function AcademicHero() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-linear-to-br from-indigo-50 to-white p-3.5">
      <Image
        src="/images/mascot/bear-print.png"
        alt="Maskot Bantuan Akademik"
        width={96}
        height={96}
        priority
        className="h-16 w-16 shrink-0 object-contain drop-shadow-md"
      />
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-slate-900">
          Bantuan Akademik
        </h3>
        <p className="text-xs text-slate-500">
          Unggah instruksi/rubrik dosen, pilih layanan, tim kami yang bantu.
        </p>
      </div>
    </div>
  );
}

interface AttachmentPickerProps {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hint: string;
  mode: AttachmentMode;
  onModeChange: (mode: AttachmentMode) => void;
  file: File | null;
  onFileChange: (file: File | null) => void;
  link: string;
  onLinkChange: (link: string) => void;
  error?: string;
  disabled?: boolean;
}

/** Pemilih lampiran: unggah berkas tunggal atau tempel link Drive. */
function AttachmentPicker({
  id,
  label,
  icon: Icon,
  hint,
  mode,
  onModeChange,
  file,
  onFileChange,
  link,
  onLinkChange,
  error,
  disabled,
}: AttachmentPickerProps) {
  return (
    <div className="space-y-2 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3">
      <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
        <Icon className="h-3.5 w-3.5 text-indigo-500" />
        {label}
      </span>

      <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-white p-1">
        {ATTACHMENT_TABS.map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onModeChange(tab.value)}
              aria-pressed={mode === tab.value}
              disabled={disabled}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[0.7rem] font-semibold transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60",
                mode === tab.value
                  ? "bg-indigo-50 text-indigo-600"
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
        <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-4 text-center transition-colors hover:border-indigo-300">
          <Upload className="h-4 w-4 text-indigo-500" />
          <span className="text-xs font-semibold text-slate-700">
            {file ? file.name : "Pilih berkas"}
          </span>
          <span className="text-[0.65rem] text-slate-400">
            {file
              ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
              : "PDF, DOCX · maks 20 MB"}
          </span>
          <input
            id={id}
            type="file"
            className="sr-only"
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
            onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
            disabled={disabled}
          />
        </label>
      ) : (
        <TextField
          id={id}
          type="url"
          label="Link"
          placeholder="https://drive.google.com/..."
          icon={Link2}
          value={link}
          onChange={(event) => onLinkChange(event.target.value)}
          error={error}
          disabled={disabled}
        />
      )}

      <p className="text-[0.65rem] leading-relaxed text-slate-400">{hint}</p>
    </div>
  );
}


const DEFAULT_REQUEST_TYPE: AcademicRequestType = "proofreading";

export function AcademicForm({ onSuccess }: AcademicFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [serviceType, setServiceType] =
    useState<AcademicRequestType>(DEFAULT_REQUEST_TYPE);
  const [deadline, setDeadline] = useState("");

  const [rubricMode, setRubricMode] = useState<AttachmentMode>("upload");
  const [rubricFile, setRubricFile] = useState<File | null>(null);
  const [rubricLink, setRubricLink] = useState("");

  const [whatsapp, setWhatsapp] = useState("");
  const [instructions, setInstructions] = useState("");

  function resetForm(): void {
    setFieldErrors({});
    setServiceType(DEFAULT_REQUEST_TYPE);
    setDeadline("");
    setRubricMode("upload");
    setRubricFile(null);
    setRubricLink("");
    setWhatsapp("");
    setInstructions("");
  }

  /**
   * Validasi ulang SATU field terhadap skema saat nilainya berubah, lalu
   * perbarui `fieldErrors`. Pesan error lama (mis. "Instruksi minimal 10
   * karakter") langsung hilang begitu nilai menjadi valid — tanpa menyentuh
   * field lain sehingga tidak membanjiri form yang belum disentuh.
   */
  function revalidateField(
    key: keyof typeof academicRequestSchema.shape,
    value: unknown,
  ): void {
    const result = academicRequestSchema.shape[key].safeParse(value);
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

  /** Hapus error satu field saat konteksnya berubah (mis. ganti mode lampiran). */
  function clearFieldError(key: string): void {
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev;
      return Object.fromEntries(
        Object.entries(prev).filter(([entryKey]) => entryKey !== key),
      );
    });
  }

  async function resolveAttachment(
    file: File | null,
    mode: AttachmentMode,
    link: string,
    label: string,
  ): Promise<string | null> {
    if (mode === "link") {
      return link.trim() === "" ? null : link.trim();
    }

    if (!file) {
      return null;
    }

    if (file.size > MAX_ACADEMIC_UPLOAD_BYTES) {
      toast.error(`Ukuran ${label} melebihi 20 MB. Gunakan link Google Drive.`);
      return null;
    }

    return uploadAcademicDocument(file);
  }

  function applyResult(result: AcademicActionResult): void {
    if (result.status === "error") {
      setFieldErrors(result.fieldErrors ?? {});
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
    resetForm();
    onSuccess?.();
    router.refresh();
    // Catatan audit: layanan akademik BELUM menetapkan tagihan (read-model
    // `amount = null`), sehingga tidak ada langkah Snap/pembayaran yang bisa
    // dipicu setelah pengajuan dibuat — pesanan cukup berstatus `pending`.
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFieldErrors({});

    startTransition(async () => {
      try {
        const rubricUrl = await resolveAttachment(
          rubricFile,
          rubricMode,
          rubricLink,
          "instruksi/rubrik dosen",
        );
        if (rubricUrl === null) {
          toast.error(
            "Lampirkan instruksi/rubrik dosen (unggah berkas atau link).",
          );
          return;
        }

        const parsed = academicRequestSchema.safeParse({
          service_type: serviceType,
          rubric_url: rubricUrl,
          whatsapp,
          instructions,
          deadline,
        });

        if (!parsed.success) {
          setFieldErrors(toFieldErrors(parsed.error));
          toast.error("Periksa kembali pengajuan Anda.");
          return;
        }

        const serviceTypeForDb =
          ACADEMIC_REQUEST_TYPE_OPTIONS.find(
            (option) => option.value === parsed.data.service_type,
          )?.serviceType ?? "proofreading";

        const formData = new FormData();
        formData.set("service_type", serviceTypeForDb);
        // Satu lampiran utama kini instruksi/rubrik dosen.
        formData.set("document_url", parsed.data.rubric_url);
        formData.set(
          "notes",
          buildAcademicNotes({
            requestType: parsed.data.service_type,
            deadline: parsed.data.deadline,
            rubricUrl: parsed.data.rubric_url,
            whatsapp: parsed.data.whatsapp,
            instructions: parsed.data.instructions,
          }),
        );

        applyResult(await createAcademicServiceAction(formData));
      } catch (cause) {
        toast.error(
          cause instanceof Error
            ? cause.message
            : "Gagal mengirim pengajuan. Silakan coba lagi.",
        );
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <AcademicHero />

      <section className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
          <ClipboardList className="h-3.5 w-3.5 text-indigo-500" />
          Jenis Layanan
        </span>

        <div className="grid grid-cols-2 gap-2">
          {ACADEMIC_REQUEST_TYPE_OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = serviceType === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setServiceType(option.value);
                  revalidateField("service_type", option.value);
                }}
                disabled={isPending}
                aria-pressed={active}
                className={cn(
                  "rounded-xl border p-2.5 text-left transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60",
                  active
                    ? "border-indigo-400 bg-indigo-50 ring-2 ring-indigo-200/60"
                    : "border-slate-200 bg-white",
                )}
              >
                <span className="mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="block text-xs font-semibold text-slate-900">
                  {option.label}
                </span>
                <span className="block text-[0.65rem] text-slate-500">
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>

        {fieldErrors.service_type ? (
          <p className="text-[0.7rem] font-medium text-red-500">
            {fieldErrors.service_type}
          </p>
        ) : null}

        <TextField
          id="deadline"
          name="deadline"
          type="datetime-local"
          label="Deadline Pengajuan"
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
          hint="Wajib diisi untuk catatan revisi & update pengerjaan"
          disabled={isPending}
          required
        />

        <TextareaField
          id="instructions"
          name="instructions"
          rows={3}
          label="Instruksi Khusus"
          placeholder="Contoh: fokus perbaikan Bab 2, target similarity < 20%, ikuti format APA 7..."
          icon={MessageSquare}
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
        <AttachmentPicker
          id="rubric_file"
          label="Instruksi / Rubrik Dosen"
          icon={ClipboardList}
          hint="Lampirkan instruksi tugas atau rubrik penilaian dari dosen."
          mode={rubricMode}
          onModeChange={(next) => {
            setRubricMode(next);
            // Mode unggah tidak memakai link — buang error rubric_url lama.
            if (next === "upload") clearFieldError("rubric_url");
          }}
          file={rubricFile}
          onFileChange={(nextFile) => {
            setRubricFile(nextFile);
            // Memilih berkas berarti menyediakan lampiran — buang error link.
            clearFieldError("rubric_url");
          }}
          link={rubricLink}
          onLinkChange={(value) => {
            setRubricLink(value);
            // Link hanya divalidasi di mode link (rubric_url wajib berupa URL).
            if (rubricMode === "link") {
              revalidateField("rubric_url", value);
            }
          }}
          error={fieldErrors.rubric_url}
          disabled={isPending}
        />
      </section>

      <button
        type="submit"
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
        <span>{isPending ? "Mengirim..." : "Kirim Pengajuan"}</span>
      </button>
    </form>
  );
}


