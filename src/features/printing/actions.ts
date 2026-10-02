"use server";

import { revalidatePath } from "next/cache";
import type { ZodError } from "zod";
import { ensureUserProfile } from "@/features/profile/ensure";
import { mapDatabaseError } from "@/lib/supabase/errors";
import { formatRupiah } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { calculatePrintPrice } from "./pricing";
import { createPrintOrderSchema, updatePrintStatusSchema } from "./schemas";
import { PRINT_STATUS_MESSAGE } from "./status";
import type {
  PrintActionResult,
  PrintOrder,
  PrintProgressStatus,
} from "./types";

const PRINTING_PATH = "/printing";

const SESSION_EXPIRED: PrintActionResult = {
  status: "error",
  message: "Sesi berakhir. Silakan login kembali.",
};

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

/** Satu kali pembuatan client + verifikasi sesi, dipakai ulang tiap action. */
async function getSessionContext() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  // Pastikan baris profil publik ada agar FK (`print_orders_user_id_fkey`)
  // tidak gagal saat membuat pesanan cetak. Sinkronisasi bersifat best-effort:
  // bila gagal (kolom hilang / RLS), error DB asli tercatat di console server
  // dan operasi tetap lanjut memakai id sesi (`auth.uid()`).
  const profile = await ensureUserProfile(supabase, data.user);
  if (!profile.ok) {
    console.warn(
      "[Profile Sync] Melanjutkan tanpa profil tersinkron:",
      profile.message,
    );
  }

  return { supabase, userId: data.user.id };
}

export async function createPrintOrderAction(
  formData: FormData,
): Promise<PrintActionResult> {
  const parsed = createPrintOrderSchema.safeParse({
    document_url: formData.get("document_url"),
    print_type: formData.get("print_type"),
    binding_type: formData.get("binding_type"),
    paper_size: formData.get("paper_size"),
    sides: formData.get("sides"),
    copies: formData.get("copies"),
    total_pages: formData.get("total_pages"),
    contact_whatsapp: formData.get("contact_whatsapp"),
    delivery_location: formData.get("delivery_location"),
    custom_note: formData.get("custom_note") ?? "",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Periksa kembali data pesanan cetak Anda.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const context = await getSessionContext();
  if (!context) {
    return SESSION_EXPIRED;
  }

  const {
    document_url,
    print_type,
    binding_type,
    paper_size,
    sides,
    copies,
    total_pages,
    contact_whatsapp,
    delivery_location,
    custom_note,
  } = parsed.data;
  const price = calculatePrintPrice(print_type, binding_type, total_pages);

  const { error } = await context.supabase.from("print_orders").insert({
    user_id: context.userId,
    document_url,
    print_type,
    binding_type,
    paper_size,
    sides,
    copies,
    total_pages,
    contact_whatsapp,
    delivery_location,
    custom_note,
    status: "pending",
  });

  if (error) {
    return {
      status: "error",
      message: mapDatabaseError(
        error.message,
        "Pesanan cetak gagal dibuat. Silakan coba lagi.",
      ),
    };
  }

  revalidatePath(PRINTING_PATH);
  return {
    status: "success",
    message: `Pesanan cetak dibuat! Estimasi ${formatRupiah(price.total)}`,
  };
}

export async function getPrintOrdersAction(): Promise<PrintOrder[]> {
  const context = await getSessionContext();
  if (!context) {
    return [];
  }

  const { data, error } = await context.supabase
    .from("print_orders")
    .select("*")
    .eq("user_id", context.userId)
    .order("created_at", { ascending: false });

  if (error) {
    return [];
  }

  const orders: PrintOrder[] = data ?? [];
  return orders;
}

export async function updatePrintStatusAction(
  orderId: string,
  status: PrintProgressStatus,
): Promise<PrintActionResult> {
  const parsed = updatePrintStatusSchema.safeParse({ orderId, status });
  if (!parsed.success) {
    return { status: "error", message: "Status pesanan tidak valid." };
  }

  const context = await getSessionContext();
  if (!context) {
    return SESSION_EXPIRED;
  }

  const { error } = await context.supabase
    .from("print_orders")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.orderId);

  if (error) {
    return {
      status: "error",
      message: mapDatabaseError(
        error.message,
        "Gagal memperbarui status pesanan cetak. Silakan coba lagi.",
      ),
    };
  }

  revalidatePath(PRINTING_PATH);
  return {
    status: "success",
    message: PRINT_STATUS_MESSAGE[parsed.data.status],
  };
}
