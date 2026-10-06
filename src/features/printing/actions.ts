"use server";

import { revalidatePath } from "next/cache";
import type { ZodError } from "zod";
import { ensureUserProfile } from "@/features/profile/ensure";
import { formatRupiah } from "@/lib/format";
import { mapDatabaseError } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchWeatherSurge } from "@/lib/weather";
import { canCancelOrder, ORDER_CANCEL_BLOCKED_MESSAGE } from "@/features/orders/cancellation";
import { applyFreeShipping, resolveFreeShippingStatus } from "@/features/orders/free-shipping";
import { countPastOrdersForFreeShipping } from "@/features/orders/free-shipping-queries";
import { resolvePrintPromo } from "@/features/promos/eligibility";
import { resolvePrintDeliveryEstimate } from "./delivery";
import { createPrintOrderSchema, updatePrintStatusSchema } from "./schemas";
import { PRINT_STATUS_MESSAGE } from "./status";
import type {
  PrintActionResult,
  PrintOrder,
  PrintProgressStatus,
  PrintStatus,
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
    copies: formData.get("copies"),
    contact_whatsapp: formData.get("contact_whatsapp"),
    delivery_location: formData.get("delivery_location"),
    custom_note: formData.get("custom_note") ?? "",
    // Koordinat titik antar bersifat opsional (dikirim form_hidden bila GPS
    // diizinkan); string kosong dinormalisasi ke `null` oleh Zod.
    destination_lat: formData.get("destination_lat") ?? null,
    destination_lng: formData.get("destination_lng") ?? null,
    // Placeholder validasi: ongkir resmi dihitung ulang di bawah setelah sesi
    // diketahui (butuh userId untuk bebas ongkir), jadi nilai awal apa pun
    // yang valid (0) boleh dipakai di sini.
    delivery_fee: 0,
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

  // Ongkir dihitung ulang di server dari teks `delivery_location` — nominal
  // dari client tidak pernah dipercaya (pola sama dengan Jastip).
  // Surge cuaca ikut diterapkan; gagal mengambil cuaca = tanpa surge.
  const weather = await fetchWeatherSurge();
  const estimate = resolvePrintDeliveryEstimate(
    parsed.data.delivery_location,
    weather.surge,
  );

  // Bebas ongkir otomatis mulai pesanan ke-4 (tanpa kode promo): hitung dari
  // database (bukan klaim client) lalu nol-kan ongkir bila eligible.
  const pastOrderCount = await countPastOrdersForFreeShipping(context.userId);
  const freeShipping = resolveFreeShippingStatus(pastOrderCount);
  const finalDeliveryFee = applyFreeShipping(
    estimate.breakdown.total,
    freeShipping.eligible,
  );

  // Promo diverifikasi ULANG di server dari kode kiriman client — bukan dari
  // nilai yang tampil di layar. Kode asing / promo milik layanan lain
  // otomatis diabaikan sehingga tidak bisa dipalsukan lewat FormData.
  const promo = await resolvePrintPromo(formData.get("promo_code"));

  const {
    document_url,
    copies,
    contact_whatsapp,
    delivery_location,
    custom_note,
    destination_lat,
    destination_lng,
  } = parsed.data;

  // Kolom opsi cetak (print_type, binding_type, total_pages) memakai default
  // database karena opsi kompleks sudah dihapus dari form. `delivery_fee`
  // disimpan agar bisa ditagihkan & ditampilkan pada read-model pesanan.
  //
  // Promo (mis. PAKET_SKRIPSI) TIDAK memotong ongkir: biaya cetak
  // dikonfirmasi manual via WhatsApp, bukan dihitung aplikasi. Klaimnya
  // disalin ke `custom_note` supaya Tim Campify melihatnya saat menghubungi
  // pemesan. Panjang catatan dijaga agar tetap di dalam batas Zod (500).
  const mergedNote = promo?.claimNote
    ? [custom_note, promo.claimNote].filter(Boolean).join(" ").slice(0, 500)
    : custom_note;

  const { data, error } = await context.supabase
    .from("print_orders")
    .insert({
      user_id: context.userId,
      document_url,
      copies,
      contact_whatsapp,
      delivery_location,
      custom_note: mergedNote,
      delivery_fee: finalDeliveryFee,
      destination_lat,
      destination_lng,
      promo_code: promo?.code ?? null,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) {
    // Log terstruktur agar akar masalah (kolom hilang / schema cache basi /
    // RLS / enum) langsung terlihat di log server, bukan hanya toast ramah
    // "Database belum sinkron..." yang diterima pengguna.
    console.error("[Print Order] INSERT gagal:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return {
      status: "error",
      message: mapDatabaseError(
        error.message,
        "Pesanan cetak gagal dibuat. Silakan coba lagi.",
      ),
    };
  }

  revalidatePath(PRINTING_PATH);
  // Baris baru dikembalikan agar form bisa langsung memicu pembayaran Snap
  // tanpa query tambahan (RLS memastikan hanya baris milik pemesan yang terbaca).
  const order = data as PrintOrder;
  if (freeShipping.eligible) {
    return {
      status: "success",
      message: `Pesanan cetak dibuat! 🎉 Gratis Ongkir (Pesanan Ke-${freeShipping.nextOrderNumber}) · Tim Campify akan segera menghubungi kamu.`,
      order,
    };
  }
  return {
    status: "success",
    message: promo
      ? `Pesanan cetak dibuat! Ongkir ${formatRupiah(finalDeliveryFee)} · ${promo.badge} aktif, konfirmasi via WhatsApp.`
      : `Pesanan cetak dibuat! Ongkir ${formatRupiah(finalDeliveryFee)} · Tim Campify akan segera menghubungi kamu.`,
    order,
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

  // Pembatalan hanya sah selama pesanan masih `pending`. Status dibaca ulang
  // dari database (tidak pernah dipercaya dari client) agar pemeriksaan tetap
  // berlaku walau klien mengirim data status lama.
  if (parsed.data.status === "cancelled") {
    const { data: current, error: readError } = await context.supabase
      .from("print_orders")
      .select("status")
      .eq("id", parsed.data.orderId)
      .maybeSingle();

    if (readError) {
      console.error("[Print] Gagal membaca status saat pembatalan:", {
        code: readError.code,
        message: readError.message,
        details: readError.details,
        hint: readError.hint,
        orderId: parsed.data.orderId,
      });

      return {
        status: "error",
        message: mapDatabaseError(
          readError.message,
          "Gagal memeriksa status pesanan. Silakan coba lagi.",
        ),
      };
    }

    if (!current) {
      return { status: "error", message: "Pesanan tidak ditemukan." };
    }

    if (!canCancelOrder(current.status as PrintStatus)) {
      return { status: "error", message: ORDER_CANCEL_BLOCKED_MESSAGE };
    }
  }

  // Defense in depth: aksi ini dipanggil dari halaman pengguna (`/printing`),
  // jadi Batasi ke pesanan milik pemanggil. RLS `print_update` juga mengizinkan
  // `user_id = auth.uid()`, sehingga tanpa filter ini pengguna bisa memaju
  // status pesanannya sendiri (pending → accepted → completed) lewat aksi
  // operator. Operator memakai `updateAdminOrderStatusAction` yang terpisah.
  let query = context.supabase
    .from("print_orders")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.orderId)
    .eq("user_id", context.userId);

  // Penjaga kedua (atomik): pembatalan hanya berlaku bila status SAAT INI
  // masih `pending`, sehingga tetap aman bila ada pembatalan bersamaan dari
  // tab/perangkat lain di antara pemeriksaan di atas dan UPDATE ini.
  if (parsed.data.status === "cancelled") {
    query = query.eq("status", "pending");
  }

  const { error } = await query;

  if (error) {
    console.error("[Print] UPDATE status gagal:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      orderId: parsed.data.orderId,
      nextStatus: parsed.data.status,
      userId: context.userId,
    });

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
