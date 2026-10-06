import {
  createSupabaseBrowserClient,
  isSupabaseBrowserConfigured,
} from "@/lib/supabase/client";
import type { SnapCustomerInfo } from "./types";

/** Baca satu field string dari objek metadata Supabase tanpa memakai `any`. */
function readStringField(source: unknown, key: string): string {
  if (typeof source !== "object" || source === null) {
    return "";
  }

  const value = (source as Record<string, unknown>)[key];
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Identitas pembeli dari sesi browser untuk `customer_details` Midtrans.
 * Email hasil sesi divalidasi ulang oleh Server Action
 * `createMidtransSnapToken` sehingga invoice tidak bisa dialihkan ke alamat
 * lain. Melempar error ramah bila sesi tidak ada.
 */
export async function resolveCustomerInfo(): Promise<SnapCustomerInfo> {
  if (!isSupabaseBrowserConfigured()) {
    throw new Error(
      "Konfigurasi Supabase belum tersedia. Hubungi admin kampus.",
    );
  }

  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("Sesi berakhir. Silakan login kembali.");
  }

  const email = data.user.email?.trim() || undefined;
  const name =
    readStringField(data.user.user_metadata, "full_name") ||
    (email ? email.split("@")[0] : "") ||
    "Mahasiswa Campify";

  return { name, email, phone: data.user.phone?.trim() || undefined };
}
