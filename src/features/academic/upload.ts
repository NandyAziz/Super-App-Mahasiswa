import {
  createSupabaseBrowserClient,
  isSupabaseBrowserConfigured,
} from "@/lib/supabase/client";
import { mapDatabaseError } from "@/lib/supabase/errors";

/** Bucket Supabase Storage untuk berkas bantuan akademik. */
export const ACADEMIC_STORAGE_BUCKET = "academic-docs";

/** Batas unggah satu berkas draft/rubrik (20 MB). */
export const MAX_ACADEMIC_UPLOAD_BYTES = 20 * 1024 * 1024;

/**
 * Mengunggah satu berkas (draft / rubrik) ke Supabase Storage lalu
 * mengembalikan URL publiknya. Melempar error ramah bila storage belum
 * dikonfigurasi atau gagal.
 */
export async function uploadAcademicDocument(file: File): Promise<string> {
  if (!isSupabaseBrowserConfigured()) {
    throw new Error(
      "Unggah berkas belum tersedia. Gunakan link Google Drive sebagai gantinya.",
    );
  }

  const supabase = createSupabaseBrowserClient();
  const path = `${Date.now()}-${crypto.randomUUID()}-${file.name}`;

  const { error } = await supabase.storage
    .from(ACADEMIC_STORAGE_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (error) {
    console.error("[Academic] Upload Storage gagal:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      bucket: ACADEMIC_STORAGE_BUCKET,
      path,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });

    throw new Error(
      mapDatabaseError(
        error.message,
        "Gagal mengunggah berkas. Silakan coba lagi.",
      ),
    );
  }

  const { data } = supabase.storage
    .from(ACADEMIC_STORAGE_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}
