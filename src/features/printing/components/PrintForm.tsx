"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Image from "next/image";
import type { ZodError } from "zod";
import {
  Copy,
  FileText,
  Layers,
  Link2,
  Loader2,
  MapPin,
  MessageSquare,
  Minus,
  Palette,
  Phone,
  Plus,
  PrinterCheck,
  Repeat,
  Ruler,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/format";
import { TextareaField } from "@/components/ui/TextareaField";
import { TextField } from "@/components/ui/TextField";
import { createPrintOrderAction } from "../actions";
import {
  PRINT_TYPE_OPTIONS,
  calculatePrintPrice,
  getPrintTypeLabel,
} from "../pricing";
import {
  FINISHING_TO_BINDING,
  PRINT_FINISHING_OPTIONS,
  PRINT_PAPER_SIZE_OPTIONS,
  PRINT_SIDE_OPTIONS,
  getFinishingLabel,
} from "../options";
import { printRequestSchema } from "../schemas";
import { MAX_UPLOAD_BYTES, uploadPrintDocument } from "../upload";
import type {
  PrintActionResult,
  PrintFinishing,
  PrintPaperSize,
  PrintSide,
  PrintType,
} from "../types";

interface PrintFormProps {
  /** Dipanggil setelah pesanan cetak berhasil dibuat. */
  onSuccess?: () => void;
}

type SourceMode = "upload" | "link";

const DEFAULT_PAGES = 10;
const DEFAULT_COPIES = 1;
const MAX_TOTAL_PAGES = 2000;

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
          Unggah dokumen atau tautkan Drive, atur opsi cetak, ambil di kampus.
        </p>
      </div>
    </div>
  );
}

interface OptionPillsProps<T extends string> {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  options: readonly { value: T; label: string; description: string }[];
  value: T;
  disabled?: boolean;
  onChange: (value: T) => void;
}

/** Grup pilihan berbentuk pill 2 kolom (warna, kertas, sisi, finishing). */
function OptionPills<T extends string>({
  label,
  icon: Icon,
  options,
  value,
  disabled,
  onChange,
}: OptionPillsProps<T>) {
  return (
    <div className="space-y-1.5">
      <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
        <Icon className="h-3.5 w-3.5 text-indigo-500" />
        {label}
      </span>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
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

export function PrintForm({ onSuccess }: PrintFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [source, setSource] = useState<SourceMode>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [link, setLink] = useState("");

  const [printType, setPrintType] = useState<PrintType>("bw");
  const [paperSize, setPaperSize] = useState<PrintPaperSize>("a4");
  const [side, setSide] = useState<PrintSide>("single");
  const [finishing, setFinishing] = useState<PrintFinishing>("none");
  const [copies, setCopies] = useState<number>(DEFAULT_COPIES);
  const [pages, setPages] = useState<number>(DEFAULT_PAGES);
  const [whatsapp, setWhatsapp] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [customNote, setCustomNote] = useState("");

  const bindingType = FINISHING_TO_BINDING[finishing];
  const effectivePages = Math.min(MAX_TOTAL_PAGES, pages * copies);
  const price = calculatePrintPrice(printType, bindingType, effectivePages);

  function resetForm(): void {
    setFieldErrors({});
    setSource("upload");
    setFile(null);
    setLink("");
    setPrintType("bw");
    setPaperSize("a4");
    setSide("single");
    setFinishing("none");
    setCopies(DEFAULT_COPIES);
    setPages(DEFAULT_PAGES);
    setWhatsapp("");
    setDeliveryLocation("");
    setCustomNote("");
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>): void {
    setFile(event.target.files?.[0] ?? null);
  }

  function handlePagesChange(event: React.ChangeEvent<HTMLInputElement>): void {
    setPages(event.target.value === "" ? 0 : Number(event.target.value));
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
          print_type: printType,
          paper_size: paperSize,
          sides: side,
          finishing,
          copies,
          total_pages: pages,
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
        formData.set("print_type", parsed.data.print_type);
        formData.set("binding_type", bindingType);
        formData.set("paper_size", parsed.data.paper_size);
        formData.set("sides", parsed.data.sides);
        formData.set("copies", String(parsed.data.copies));
        formData.set("total_pages", String(effectivePages));
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
        <div className="flex items-center gap-1.5">
          <Palette className="h-4 w-4 text-indigo-500" />
          <span className="text-xs font-medium text-slate-600">Opsi Cetak</span>
        </div>

        <OptionPills
          label="Warna"
          icon={Palette}
          options={PRINT_TYPE_OPTIONS}
          value={printType}
          disabled={isPending}
          onChange={setPrintType}
        />

        <OptionPills
          label="Ukuran Kertas"
          icon={Ruler}
          options={PRINT_PAPER_SIZE_OPTIONS}
          value={paperSize}
          disabled={isPending}
          onChange={setPaperSize}
        />

        <OptionPills
          label="Sisi Cetak"
          icon={Repeat}
          options={PRINT_SIDE_OPTIONS}
          value={side}
          disabled={isPending}
          onChange={setSide}
        />

        <OptionPills
          label="Finishing"
          icon={Layers}
          options={PRINT_FINISHING_OPTIONS}
          value={finishing}
          disabled={isPending}
          onChange={setFinishing}
        />

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
              onClick={() => setCopies((value) => Math.min(100, value + 1))}
              disabled={isPending || copies >= 100}
              aria-label="Tambah salinan"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <TextField
          id="total_pages"
          name="total_pages"
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_TOTAL_PAGES}
          label="Jumlah Halaman per Salinan"
          icon={Layers}
          value={pages}
          onChange={handlePagesChange}
          error={fieldErrors.total_pages}
          disabled={isPending}
          required
        />

        <TextareaField
          id="custom_note"
          name="custom_note"
          rows={3}
          label="Catatan Kebutuhan Khusus"
          placeholder="Contoh: jilid jepret tengah, kertas kover warna merah, cetak halaman terbalik..."
          icon={MessageSquare}
          value={customNote}
          onChange={(event) => setCustomNote(event.target.value)}
          error={fieldErrors.custom_note}
          hint="Tulis permintaan khusus yang tidak ada di opsi standar di atas"
          disabled={isPending}
        />
      </section>

      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
        <p className="mb-2 text-[0.7rem] font-semibold tracking-wide text-indigo-500 uppercase">
          Estimasi Harga
        </p>
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>
            {getPrintTypeLabel(printType)} × {effectivePages} lembar
          </span>
          <span>{formatRupiah(price.printCost)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-slate-600">
          <span>Finishing {getFinishingLabel(finishing)}</span>
          <span>{formatRupiah(price.bindingCost)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-indigo-100 pt-2 text-sm font-semibold text-slate-900">
          <span>Total Estimasi</span>
          <span>{formatRupiah(price.total)}</span>
        </div>
      </div>

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

