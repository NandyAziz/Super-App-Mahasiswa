import {
  createSupabaseBrowserClient,
  isSupabaseBrowserConfigured,
} from "@/lib/supabase/client";
import { mapDatabaseError } from "@/lib/supabase/errors";

/** Bucket Supabase Storage untuk bukti transfer. */
export const PAYMENT_PROOF_STORAGE_BUCKET = "payment-proofs";

/** Batas unggah bukti transfer (5 MB). */
export const MAX_PAYMENT_PROOF_BYTES = 5 * 1024 * 1024;

/**
 * Mengunggah satu gambar bukti pembayaran (maks 5 MB) ke Supabase Storage lalu
 * mengembalikan URL publiknya untuk disimpan sebagai `payment_proof_url`.
 * Melempar error ramah bila storage belum dikonfigurasi atau gagal.
 */
export async function uploadPaymentProof(file: File): Promise<string> {
  if (!isSupabaseBrowserConfigured()) {
    throw new Error(
      "Unggah bukti belum tersedia. Hubungi admin kampus untuk mengirim bukti manual.",
    );
  }

  if (file.size > MAX_PAYMENT_PROOF_BYTES) {
    throw new Error("Ukuran bukti pembayaran maksimal 5 MB.");
  }

  const supabase = createSupabaseBrowserClient();
  const path = `${Date.now()}-${crypto.randomUUID()}-${file.name}`;

  const { error } = await supabase.storage
    .from(PAYMENT_PROOF_STORAGE_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (error) {
    throw new Error(
      mapDatabaseError(error.message, "Gagal mengunggah bukti. Silakan coba lagi."),
    );
  }

  const { data } = supabase.storage
    .from(PAYMENT_PROOF_STORAGE_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}
