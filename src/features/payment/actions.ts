"use server";

import { revalidatePath } from "next/cache";
import type { OrderService } from "@/features/orders/types";
import { buildMidtransOrderId, createSnapTransaction } from "@/lib/midtrans";
import { mapDatabaseError } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PENDING_VERIFICATION_STATUS } from "./constants";
import { createSnapTokenSchema, submitPaymentProofSchema } from "./schemas";
import type {
  PaymentActionResult,
  SnapCustomerInfo,
  SnapItemDetail,
  SnapTokenActionResult,
} from "./types";

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
    // Log terstruktur agar akar masalah (kolom hilang / schema cache basi /
    // RLS / enum) langsung terlihat di log server, bukan hanya toast ramah
    // "Database belum sinkron..." yang diterima pengguna.
    console.error("[Payment Proof] UPDATE gagal:", {
      service: parsed.data.serviceName,
      orderId: parsed.data.orderId,
      code: result.error.code,
      message: result.error.message,
      details: result.error.details,
      hint: result.error.hint,
    });
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

/** Pesanan yang ditemukan & punya nominal tagihan siap dibayar via Snap. */
interface PayableOrder {
  service: OrderService;
  amount: number;
}

/**
 * Melacak pesanan `pending` milik user yang punya tagihan di 4 tabel
 * berbayar (skema akademik dilewati — belum menetapkan nominal). Kueri
 * paralel; RLS + filter pemilik & status menjadi jaring pengaman ganda
 * sehingga token tidak bisa dibuat untuk pesanan milik orang lain.
 */
async function findPayableOrder(
  supabase: SupabaseServerClient,
  orderId: string,
  userId: string,
): Promise<PayableOrder | null> {
  const [jastip, printing, projects, tutoring] = await Promise.all([
    supabase
      .from("jastip_orders")
      .select("delivery_tip")
      .eq("id", orderId)
      .eq("user_id", userId)
      .eq("status", "pending")
      .maybeSingle(),
    supabase
      .from("print_orders")
      .select("delivery_fee")
      .eq("id", orderId)
      .eq("user_id", userId)
      .eq("status", "pending")
      .maybeSingle(),
    supabase
      .from("coding_projects")
      .select("budget")
      .eq("id", orderId)
      .eq("client_id", userId)
      .eq("status", "pending")
      .maybeSingle(),
    supabase
      .from("tutoring_sessions")
      .select("price")
      .eq("id", orderId)
      .eq("student_id", userId)
      .eq("status", "pending")
      .maybeSingle(),
  ]);

  for (const result of [jastip, printing, projects, tutoring]) {
    if (result.error) {
      console.error("[Midtrans Snap] lookup pesanan gagal:", {
        orderId,
        code: result.error.code,
        message: result.error.message,
      });
    }
  }

  const jastipRow = (jastip.error ? null : jastip.data) as {
    delivery_tip: number;
  } | null;
  if (jastipRow && jastipRow.delivery_tip > 0) {
    return { service: "jastip", amount: jastipRow.delivery_tip };
  }

  const printRow = (printing.error ? null : printing.data) as {
    delivery_fee: number;
  } | null;
  if (printRow && printRow.delivery_fee > 0) {
    return { service: "printing", amount: printRow.delivery_fee };
  }

  const projectRow = (projects.error ? null : projects.data) as {
    budget: number;
  } | null;
  if (projectRow && projectRow.budget > 0) {
    return { service: "projects", amount: projectRow.budget };
  }

  const tutoringRow = (tutoring.error ? null : tutoring.data) as {
    price: number;
  } | null;
  if (tutoringRow && tutoringRow.price > 0) {
    return { service: "tutoring", amount: tutoringRow.price };
  }

  return null;
}

/**
 * Membuat token transaksi Midtrans Snap (PRODUCTION) untuk satu pesanan.
 *
 * Validasi berlapis: Zod → sesi user → kepemilikan & status pesanan (RLS) →
 * kecocokan nominal `amount`/`itemDetails` dengan tagihan asli di database.
 * Token diteruskan ke `window.snap.pay(token)` pada modal checkout.
 */
export async function createMidtransSnapToken(
  orderId: string,
  amount: number,
  customerInfo: SnapCustomerInfo,
  itemDetails: SnapItemDetail[],
): Promise<SnapTokenActionResult> {
  const parsed = createSnapTokenSchema.safeParse({
    orderId,
    amount,
    customerInfo,
    itemDetails,
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Data pembayaran tidak valid. Muat ulang halaman lalu coba lagi.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { status: "error", message: "Sesi berakhir. Silakan login kembali." };
  }

  const payable = await findPayableOrder(
    supabase,
    parsed.data.orderId,
    data.user.id,
  );
  if (!payable) {
    return {
      status: "error",
      message:
        "Pesanan tidak dapat dibayar (bukan milik Anda, sudah diproses, atau belum memiliki tagihan).",
    };
  }

  const itemsTotal = parsed.data.itemDetails.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );
  if (parsed.data.amount !== payable.amount || itemsTotal !== payable.amount) {
    console.error("[Midtrans Snap] nominal tidak cocok:", {
      orderId: parsed.data.orderId,
      clientAmount: parsed.data.amount,
      itemsTotal,
      databaseAmount: payable.amount,
    });
    return {
      status: "error",
      message:
        "Total pembayaran tidak sesuai dengan pesanan. Muat ulang halaman lalu coba lagi.",
    };
  }

  // Email sesi diprioritaskan agar invoice tidak dikirim ke alamat lain.
  const sessionEmail = data.user.email?.trim() || undefined;

  try {
    const snap = await createSnapTransaction({
      transaction_details: {
        order_id: buildMidtransOrderId(payable.service, parsed.data.orderId),
        gross_amount: payable.amount,
      },
      item_details: parsed.data.itemDetails,
      customer_details: {
        first_name: parsed.data.customerInfo.name,
        email: sessionEmail ?? parsed.data.customerInfo.email,
        phone: parsed.data.customerInfo.phone || undefined,
      },
    });

    return {
      status: "success",
      token: snap.token,
      redirectUrl: snap.redirectUrl,
    };
  } catch (cause) {
    console.error("[Midtrans Snap] pembuatan token gagal:", {
      orderId: parsed.data.orderId,
      service: payable.service,
      message: cause instanceof Error ? cause.message : String(cause),
    });
    return {
      status: "error",
      message:
        cause instanceof Error
          ? cause.message
          : "Gagal membuat pembayaran. Silakan coba lagi.",
    };
  }
}

