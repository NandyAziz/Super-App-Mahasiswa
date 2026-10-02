import {
  createSupabaseBrowserClient,
  isSupabaseBrowserConfigured,
} from "@/lib/supabase/client";
import { mapDatabaseError } from "@/lib/supabase/errors";

/** Bucket Supabase Storage untuk berkas cetak. */
export const PRINT_STORAGE_BUCKET = "print-documents";

/** Batas unggah satu berkas (20 MB) sesuai aturan produk. */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

/**
 * Mengunggah satu berkas dokumen (maks 20 MB) ke Supabase Storage lalu
 * mengembalikan URL publiknya untuk disimpan sebagai `document_url`.
 * Melempar error ramah bila storage belum dikonfigurasi atau gagal.
 */
export async function uploadPrintDocument(file: File): Promise<string> {
  if (!isSupabaseBrowserConfigured()) {
    throw new Error(
      "Unggah berkas belum tersedia. Gunakan link Google Drive sebagai gantinya.",
    );
  }

  const supabase = createSupabaseBrowserClient();
  const path = `${Date.now()}-${crypto.randomUUID()}-${file.name}`;

  const { error } = await supabase.storage
    .from(PRINT_STORAGE_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (error) {
    throw new Error(
      mapDatabaseError(error.message, "Gagal mengunggah berkas. Silakan coba lagi."),
    );
  }

  const { data } = supabase.storage
    .from(PRINT_STORAGE_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}
