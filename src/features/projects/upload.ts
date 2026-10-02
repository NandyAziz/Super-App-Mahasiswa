import {
  createSupabaseBrowserClient,
  isSupabaseBrowserConfigured,
} from "@/lib/supabase/client";
import { mapDatabaseError } from "@/lib/supabase/errors";

/** Bucket Supabase Storage untuk berkas brief / ZIP proyek. */
export const PROJECT_STORAGE_BUCKET = "project-briefs";

/** Batas unggah berkas brief / ZIP (25 MB). */
export const MAX_PROJECT_UPLOAD_BYTES = 25 * 1024 * 1024;

/**
 * Mengunggah satu berkas brief/ZIP ke Supabase Storage lalu mengembalikan URL
 * publiknya untuk dipakai sebagai lampiran proyek. Melempar error ramah bila
 * storage belum dikonfigurasi atau gagal.
 */
export async function uploadProjectBrief(file: File): Promise<string> {
  if (!isSupabaseBrowserConfigured()) {
    throw new Error(
      "Unggah berkas belum tersedia. Gunakan link Google Drive / GitHub / Figma.",
    );
  }

  const supabase = createSupabaseBrowserClient();
  const path = `${Date.now()}-${crypto.randomUUID()}-${file.name}`;

  const { error } = await supabase.storage
    .from(PROJECT_STORAGE_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (error) {
    throw new Error(
      mapDatabaseError(
        error.message,
        "Gagal mengunggah berkas. Silakan coba lagi.",
      ),
    );
  }

  const { data } = supabase.storage
    .from(PROJECT_STORAGE_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}
