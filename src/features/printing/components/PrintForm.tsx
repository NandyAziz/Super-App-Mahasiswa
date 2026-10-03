"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Image from "next/image";
import type { ZodError } from "zod";
import {
  Copy,
  FileText,
  Link2,
  Loader2,
  MapPin,
  MessageSquare,
  Minus,
  Phone,
  Plus,
  PrinterCheck,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TextareaField } from "@/components/ui/TextareaField";
import { TextField } from "@/components/ui/TextField";
import { createPrintOrderAction } from "../actions";
import { printRequestSchema } from "../schemas";
import { MAX_UPLOAD_BYTES, uploadPrintDocument } from "../upload";
import type { PrintActionResult } from "../types";

interface PrintFormProps {
  /** Dipanggil setelah pesanan cetak berhasil dibuat. */
  onSuccess?: () => void;
}

type SourceMode = "upload" | "link";

const DEFAULT_COPIES = 1;
const MAX_COPIES = 100;

/** Mode lampiran dokumen: unggah berkas tunggal atau tempel link Drive. */
const SOURCE_TABS: readonly {
  value: SourceMode;
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

/** Header bento dengan maskot Jasa Cetak sebagai ilustrasi hero. */
function PrintHero() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-linear-to-br from-indigo-50 to-white p-3.5">
      <Image
        src="/images/mascot/bear-print.png"
        alt="Maskot Jasa Cetak"
        width={96}
        height={96}
        priority
        className="h-16 w-16 shrink-0 object-contain drop-shadow-md"
      />
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-slate-900">Jasa Cetak</h3>
        <p className="text-xs text-slate-500">
          Unggah dokumen atau tautkan Drive, ambil hasil cetak di kampus.
        </p>
      </div>
    </div>
  );
}

export function PrintForm({ onSuccess }: PrintFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [source, setSource] = useState<SourceMode>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [link, setLink] = useState("");

  const [copies, setCopies] = useState<number>(DEFAULT_COPIES);
  const [whatsapp, setWhatsapp] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [customNote, setCustomNote] = useState("");

  function resetForm(): void {
    setFieldErrors({});
    setSource("upload");
    setFile(null);
    setLink("");
    setCopies(DEFAULT_COPIES);
    setWhatsapp("");
    setDeliveryLocation("");
    setCustomNote("");
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>): void {
    setFile(event.target.files?.[0] ?? null);
  }

  async function resolveDocumentUrl(): Promise<string | null> {
    if (source === "link") {
      return link.trim() === "" ? null : link.trim();
    }

    if (!file) {
      return null;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("Ukuran berkas melebihi 20 MB. Gunakan link Google Drive.");
      return null;
    }

    return uploadPrintDocument(file);
  }

  function applyResult(result: PrintActionResult): void {
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
        const documentUrl = await resolveDocumentUrl();

        if (!documentUrl) {
          toast.error(
            source === "upload"
              ? "Pilih berkas dokumen terlebih dahulu."
              : "Isi link Google Drive dokumenmu.",
          );
          return;
        }

        const parsed = printRequestSchema.safeParse({
          document_url: documentUrl,
          copies,
          contact_whatsapp: whatsapp,
          delivery_location: deliveryLocation,
          custom_note: customNote,
        });

        if (!parsed.success) {
          setFieldErrors(toFieldErrors(parsed.error));
          toast.error("Periksa kembali data pesanan cetak Anda.");
          return;
        }

        const formData = new FormData();
        formData.set("document_url", parsed.data.document_url);
        formData.set("copies", String(parsed.data.copies));
        formData.set("contact_whatsapp", parsed.data.contact_whatsapp);
        formData.set("delivery_location", parsed.data.delivery_location);
        formData.set("custom_note", parsed.data.custom_note);

        applyResult(await createPrintOrderAction(formData));
      } catch (cause) {
        toast.error(
          cause instanceof Error
            ? cause.message
            : "Gagal membuat pesanan cetak. Silakan coba lagi.",
        );
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <PrintHero />

      <section className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-1.5">
          <FileText className="h-4 w-4 text-indigo-500" />
          <span className="text-xs font-medium text-slate-600">
            Lampiran Dokumen
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
          {SOURCE_TABS.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setSource(tab.value)}
                aria-pressed={source === tab.value}
                disabled={isPending}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60",
                  source === tab.value
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

        {source === "upload" ? (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-5 text-center transition-colors hover:border-indigo-300">
            <Upload className="h-5 w-5 text-indigo-500" />
            <span className="text-xs font-semibold text-slate-700">
              {file ? file.name : "Pilih berkas dokumen"}
            </span>
            <span className="text-[0.65rem] text-slate-400">
              {file
                ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
                : "PDF, DOC, atau gambar · maks 20 MB"}
            </span>
            <input
              type="file"
              className="sr-only"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              disabled={isPending}
            />
          </label>
        ) : (
          <TextField
            id="document_url"
            name="document_url"
            type="url"
            label="Link Google Drive"
            placeholder="https://drive.google.com/..."
            icon={Link2}
            value={link}
            onChange={(event) => setLink(event.target.value)}
            error={fieldErrors.document_url}
            disabled={isPending}
            hint="Tempel link dokumen yang bisa diakses publik"
          />
        )}

        <p className="text-[0.65rem] leading-relaxed text-slate-400">
          Butuh lebih dari 1 berkas atau ukuran &gt; 20 MB? Gunakan link Google
          Drive agar kurir mudah mengunduh semuanya.
        </p>
      </section>


      <section className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-1.5">
          <Phone className="h-4 w-4 text-indigo-500" />
          <span className="text-xs font-medium text-slate-600">
            Kontak &amp; Pengantaran
          </span>
        </div>

        <TextField
          id="contact_whatsapp"
          name="contact_whatsapp"
          type="tel"
          inputMode="tel"
          label="Nomor WhatsApp Aktif"
          placeholder="08123456789"
          icon={Phone}
          value={whatsapp}
          onChange={(event) => setWhatsapp(event.target.value)}
          error={fieldErrors.contact_whatsapp}
          hint="Wajib diisi untuk konfirmasi pesanan & koordinasi mitra cetak"
          disabled={isPending}
          required
        />

        <TextField
          id="delivery_location"
          name="delivery_location"
          label="Lokasi Antar / Pengambilan"
          placeholder="Contoh: Gedung C Lt 2 depan R. 204 atau Kost Orange Gang 3"
          icon={MapPin}
          value={deliveryLocation}
          onChange={(event) => setDeliveryLocation(event.target.value)}
          error={fieldErrors.delivery_location}
          disabled={isPending}
          required
        />
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <Copy className="h-3.5 w-3.5 text-indigo-500" />
            Jumlah Salinan
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCopies((value) => Math.max(1, value - 1))}
              disabled={isPending || copies <= 1}
              aria-label="Kurangi salinan"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-6 text-center text-sm font-semibold text-slate-900">
              {copies}
            </span>
            <button
              type="button"
              onClick={() =>
                setCopies((value) => Math.min(MAX_COPIES, value + 1))
              }
              disabled={isPending || copies >= MAX_COPIES}
              aria-label="Tambah salinan"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <TextareaField
          id="custom_note"
          name="custom_note"
          rows={3}
          label="Catatan (opsional)"
          placeholder="Contoh: cetak warna untuk cover, jilid spiral, halaman tertentu saja..."
          icon={MessageSquare}
          value={customNote}
          onChange={(event) => setCustomNote(event.target.value)}
          error={fieldErrors.custom_note}
          hint="Tulis permintaan khusus bila ada"
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
          <PrinterCheck className="h-4 w-4" />
        )}
        <span>{isPending ? "Mengirim..." : "Buat Pesanan Cetak"}</span>
      </button>
    </form>
  );
}

