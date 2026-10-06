import { NextResponse, type NextRequest } from "next/server";
import { JASTIP_PAID_STATUS } from "@/features/jastip/types";
import type { OrderService, OrderStatus } from "@/features/orders/types";
import { PAID_ORDER_STATUS } from "@/features/payment/constants";
import {
  midtransNotificationSchema,
  midtransOrderServiceSchema,
} from "@/features/payment/schemas";
import {
  parseMidtransOrderId,
  resolveMidtransPaymentOutcome,
  verifyMidtransSignature,
} from "@/lib/midtrans";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** Nama tabel Supabase tiap layanan (selaras `SERVICE_TABLES` fitur admin). */
const SERVICE_TABLES: Record<OrderService, string> = {
  jastip: "jastip_orders",
  printing: "print_orders",
  projects: "coding_projects",
  tutoring: "tutoring_sessions",
  academic: "academic_services",
};

/** Status "lunas" per layanan setelah pembayaran Midtrans settlement. */
const PAID_STATUS_BY_SERVICE: Record<OrderService, string> = {
  jastip: JASTIP_PAID_STATUS,
  printing: PAID_ORDER_STATUS,
  projects: PAID_ORDER_STATUS,
  tutoring: PAID_ORDER_STATUS,
  academic: PAID_ORDER_STATUS,
};

/** Status pesanan yang masih boleh berubah oleh notifikasi pembayaran. */
const PAYABLE_ORDER_STATUSES = ["pending", "PENDING_VERIFICATION"];

/** Status batal (deny/cancel/expire) — selaras enum `order_status`. */
const CANCELLED_ORDER_STATUS: OrderStatus = "cancelled";

/** Respons JSON berstatus dalam satu baris. */
function json(status: number, body: Record<string, unknown>): NextResponse {
  return NextResponse.json(body, { status });
}

/**
 * Webhook notifikasi HTTP Midtrans (server-to-server, tanpa sesi user).
 *
 * Alur: validasi Zod → verifikasi `signature_key`
 * (`SHA512(order_id + status_code + gross_amount + ServerKey)`) →
 * `settlement`/`capture` menandai pesanan lunas (`PAID`; Jastip `accepted`,
 * selaras alur verifikasi operator) → `deny`/`cancel`/`expire` membatalkan
 * pesanan yang masih `pending`. Klien snapshot dari browser hanya umpan balik
 * UX; sumber kebenaran status pembayaran adalah route ini.
 *
 * Memerlukan `SUPABASE_SERVICE_ROLE_KEY` karena notifikasi tidak memiliki
 * sesi sehingga tidak bisa melewati RLS dengan cara lain.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const payload: unknown = await request.json().catch(() => null);
  const parsed = midtransNotificationSchema.safeParse(payload);
  if (!parsed.success) {
    return json(400, { message: "Notifikasi Midtrans tidak valid." });
  }

  const notification = parsed.data;
  const reference = parseMidtransOrderId(notification.order_id);
  const service = midtransOrderServiceSchema.safeParse(reference?.service ?? "");
  if (!reference || !service.success) {
    return json(400, { message: "order_id tidak dikenali." });
  }

  let signatureValid = false;
  try {
    signatureValid = await verifyMidtransSignature({
      orderId: notification.order_id,
      statusCode: notification.status_code,
      grossAmount: notification.gross_amount,
      signatureKey: notification.signature_key,
    });
  } catch (cause) {
    console.error("[Midtrans Webhook] verifikasi signature gagal:", {
      message: cause instanceof Error ? cause.message : String(cause),
    });
    return json(500, {
      message: "Konfigurasi MIDTRANS_SERVER_KEY belum lengkap.",
    });
  }

  if (!signatureValid) {
    console.error("[Midtrans Webhook] signature_key tidak cocok:", {
      orderId: notification.order_id,
      statusCode: notification.status_code,
      transactionStatus: notification.transaction_status,
    });
    return json(401, { message: "Signature tidak valid." });
  }

  const outcome = resolveMidtransPaymentOutcome(
    notification.transaction_status,
    notification.fraud_status,
  );
  if (!outcome) {
    // Status non-final (pending / refund dsb.) — cukup diakui agar Midtrans
    // tidak mengulang pengiriman notifikasi yang sama.
    return json(200, { received: true, action: "ignored" });
  }

  const nextStatus =
    outcome === "paid"
      ? PAID_STATUS_BY_SERVICE[service.data]
      : CANCELLED_ORDER_STATUS;

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from(SERVICE_TABLES[service.data])
      .update({ status: nextStatus })
      .eq("id", reference.orderId)
      .in("status", PAYABLE_ORDER_STATUSES)
      .select("id");

    if (error) {
      console.error("[Midtrans Webhook] update status pesanan gagal:", {
        service: service.data,
        orderId: reference.orderId,
        code: error.code,
        message: error.message,
        hint: error.hint,
      });
      return json(500, { message: "Gagal memperbarui status pesanan." });
    }

    const updated = (data ?? []).length > 0;
    return json(200, { received: true, updated });
  } catch (cause) {
    console.error("[Midtrans Webhook] admin client gagal:", {
      message: cause instanceof Error ? cause.message : String(cause),
    });
    return json(500, {
      message: "Konfigurasi SUPABASE_SERVICE_ROLE_KEY belum lengkap.",
    });
  }
}
