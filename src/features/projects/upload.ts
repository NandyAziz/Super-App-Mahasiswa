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
    // Catat error Supabase secara utuh (name, status, code, pesan, objek
    // mentah) plus konteks unggah agar masalah bucket / RLS / payload dapat
    // didiagnosis — bukan sekadar objek kosong.
    console.error("[Projects] Upload Storage gagal:", {
      name: error.name,
      message: error.message,
      status: error.status,
      statusCode: error.statusCode,
      code: error.code,
      details: error.details,
      hint: error.hint,
      rawError: error,
      bucket: PROJECT_STORAGE_BUCKET,
      path,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });

    const rawMessage = error.message ?? "";

    // Bucket hanya dapat ditulis user terautentikasi (kebijakan
    // `campify_storage_insert` -> `to authenticated`). Kegagalan izin
    // (401/403 atau pesan RLS) diberi pesan yang eksplisit, bukan fallback umum.
    const isPermissionBlocked =
      error.status === 401 ||
      error.status === 403 ||
      /permission denied|not authorized|access denied|row[- ]level security|unauthenticated|invalid api key|jwt/i.test(
        rawMessage,
      );

    const friendlyMessage = isPermissionBlocked
      ? "Unggahan ditolak oleh kebijakan bucket (RLS). Pastikan Anda login ke akun kampus lalu coba lagi."
      : mapDatabaseError(
          rawMessage,
          `Gagal mengunggah berkas ke bucket "${PROJECT_STORAGE_BUCKET}". Silakan coba lagi.`,
        );

    throw new Error(friendlyMessage);
  }

  const { data } = supabase.storage
    .from(PROJECT_STORAGE_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}
