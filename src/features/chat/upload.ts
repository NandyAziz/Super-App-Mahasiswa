import {
  createSupabaseBrowserClient,
  isSupabaseBrowserConfigured,
} from "@/lib/supabase/client";
import { mapDatabaseError } from "@/lib/supabase/errors";

/** Bucket Supabase Storage untuk lampiran foto chat. */
export const CHAT_STORAGE_BUCKET = "chat-attachments";

/** Batas unggah satu foto (5 MB). */
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

/** Hanya gambar yang boleh diunggah ke bucket lampiran chat. */
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export function isAcceptedImage(file: File): boolean {
  return (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type);
}

/**
 * Mengunggah satu foto (maks 5 MB) ke bucket `chat-attachments` lalu
 * mengembalikan URL publiknya. Melempar error ramah bila gagal.
 */
export async function uploadChatAttachment(file: File): Promise<string> {
  if (!isSupabaseBrowserConfigured()) {
    throw new Error("Unggah lampiran belum tersedia. Coba lagi nanti.");
  }

  if (!isAcceptedImage(file)) {
    throw new Error("Hanya gambar (JPG, PNG, WebP, GIF) yang didukung.");
  }

  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error("Ukuran foto maksimal 5 MB.");
  }

  const supabase = createSupabaseBrowserClient();
  const path = `${Date.now()}-${crypto.randomUUID()}.jpg`;

  const { error } = await supabase.storage
    .from(CHAT_STORAGE_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    throw new Error(
      mapDatabaseError(error.message, "Gagal mengunggah foto. Coba lagi."),
    );
  }

  const { data } = supabase.storage
    .from(CHAT_STORAGE_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}
