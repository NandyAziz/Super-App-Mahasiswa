"use server";

import { revalidatePath } from "next/cache";
import type { OrderService } from "@/features/orders/types";
import { mapDatabaseError } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PENDING_VERIFICATION_STATUS } from "./constants";
import { submitPaymentProofSchema } from "./schemas";
import type { PaymentActionResult } from "./types";

type SupabaseServerClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;

const ORDERS_PATH = "/orders";

/** Route customer-facing tiap layanan yang perlu di-refresh setelah update. */
const SERVICE_PATHS: Record<OrderService, string> = {
  jastip: "/jastip",
  printing: "/printing",
  projects: "/projects",
  tutoring: "/tutoring",
  academic: "/academic",
};

/**
 * Menyimpan URL bukti transfer dan mengubah status menjadi `PENDING_VERIFICATION`.
 * Setiap cabang memfilter kolom pemilik + status `pending` sebagai jaring
 * pengaman kedua selain RLS Supabase, sehingga user tidak bisa mengunggah bukti
 * untuk pesanan milik orang lain atau yang sudah diproses.
 */
function submitProof(
  supabase: SupabaseServerClient,
  service: OrderService,
  orderId: string,
  userId: string,
  proofUrl: string,
) {
  const payload = {
    status: PENDING_VERIFICATION_STATUS,
    payment_proof_url: proofUrl,
  };

  switch (service) {
    case "jastip":
      return supabase
        .from("jastip_orders")
        .update(payload)
        .eq("id", orderId)
        .eq("user_id", userId)
        .eq("status", "pending")
        .select("id");
    case "printing":
      return supabase
        .from("print_orders")
        .update(payload)
        .eq("id", orderId)
        .eq("user_id", userId)
        .eq("status", "pending")
        .select("id");
    case "projects":
      return supabase
        .from("coding_projects")
        .update(payload)
        .eq("id", orderId)
        .eq("client_id", userId)
        .eq("status", "pending")
        .select("id");
    case "tutoring":
      return supabase
        .from("tutoring_sessions")
        .update(payload)
        .eq("id", orderId)
        .eq("student_id", userId)
        .eq("status", "pending")
        .select("id");
    case "academic":
      return supabase
        .from("academic_services")
        .update(payload)
        .eq("id", orderId)
        .eq("user_id", userId)
        .eq("status", "pending")
        .select("id");
  }
}

/**
 * Mengirim bukti pembayaran manual QRIS: menyimpan `payment_proof_url` lalu
 * memindahkan pesanan ke `PENDING_VERIFICATION` agar diverifikasi operator.
 */
export async function submitPaymentProofAction(input: {
  orderId: string;
  serviceName: OrderService;
  proofUrl: string;
}): Promise<PaymentActionResult> {
  const parsed = submitPaymentProofSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "Data bukti pembayaran tidak valid." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { status: "error", message: "Sesi berakhir. Silakan login kembali." };
  }

  const result = await submitProof(
    supabase,
    parsed.data.serviceName,
    parsed.data.orderId,
    data.user.id,
    parsed.data.proofUrl,
  );

  if (result.error) {
    return {
      status: "error",
      message: mapDatabaseError(
        result.error.message,
        "Bukti pembayaran gagal dikirim. Silakan coba lagi.",
      ),
    };
  }

  if (!result.data || result.data.length === 0) {
    return {
      status: "error",
      message:
        "Pesanan tidak dapat dibayar (bukan milik Anda atau sudah diproses).",
    };
  }

  revalidatePath(ORDERS_PATH);
  revalidatePath(`${ORDERS_PATH}/${parsed.data.orderId}`);
  revalidatePath(SERVICE_PATHS[parsed.data.serviceName]);
  return {
    status: "success",
    message: "Bukti pembayaran terkirim! Menunggu verifikasi operator. ⏳",
  };
}
