"use server";

import { revalidatePath } from "next/cache";
import type { ZodError } from "zod";
import { ensureUserProfile } from "@/features/profile/ensure";
import { formatRupiah } from "@/lib/format";
import {
  JastipOutOfRangeError,
  calculateJastipShippingFee,
} from "@/lib/pricing";
import { mapDatabaseError } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  acceptJastipOrderSchema,
  createJastipSchema,
  updateJastipStatusSchema,
} from "./schemas";
import { buildJastipPickupLabel } from "./locations";
import type {
  JastipActionResult,
  JastipOrder,
  JastipProgressStatus,
} from "./types";

const JASTIP_PATH = "/jastip";

const SESSION_EXPIRED: JastipActionResult = {
  status: "error",
  message: "Sesi berakhir. Silakan login kembali.",
};

const NOT_LOGGED_IN: JastipActionResult = {
  status: "error",
  message: "Silakan login terlebih dahulu untuk membuat titipan.",
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

  // Pastikan baris profil publik ada agar FK (`jastip_orders_user_id_fkey`)
  // tidak gagal saat menulis pesanan baru. Sinkronisasi bersifat best-effort:
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

export async function createJastipOrderAction(
  formData: FormData,
): Promise<JastipActionResult> {
  const parsed = createJastipSchema.safeParse({
    item_name: formData.get("item_name"),
    whatsapp: formData.get("whatsapp"),
    dropoff_location: formData.get("dropoff_location"),
    distance_km: formData.get("distance_km"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Periksa kembali data titipan Anda.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  // Ongkir dihitung ulang di server (sumber kebenaran) — nominal dari client
  // tidak pernah dipercaya.
  let shippingTotal: number;
  try {
    shippingTotal = calculateJastipShippingFee({
      distanceKm: parsed.data.distance_km,
    }).total;
  } catch (cause) {
    const message =
      cause instanceof JastipOutOfRangeError
        ? cause.message
        : "Gagal menghitung ongkir. Silakan coba lagi.";
    return { status: "error", message, fieldErrors: { distance_km: message } };
  }

  const context = await getSessionContext();
  if (!context) {
    return NOT_LOGGED_IN;
  }

  const { data, error } = await context.supabase
    .from("jastip_orders")
    .insert({
      user_id: context.userId,
      item_name: parsed.data.item_name,
      // Nomor WA wajib digabung ke kolom teks `pickup_location` karena tabel
      // `jastip_orders` tidak punya kolom kontak khusus.
      pickup_location: buildJastipPickupLabel(parsed.data.whatsapp),
      dropoff_location: parsed.data.dropoff_location,
      delivery_tip: shippingTotal,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) {
    return {
      status: "error",
      message: mapDatabaseError(
        error.message,
        "Titipan gagal dibuat. Silakan coba lagi.",
      ),
    };
  }

  revalidatePath(JASTIP_PATH);
  return {
    status: "success",
    message: `Titipan dibuat! Ongkir ${formatRupiah(shippingTotal)}`,
    order: data as JastipOrder,
  };
}

export async function getJastipOrdersAction(): Promise<JastipOrder[]> {
  const context = await getSessionContext();
  if (!context) {
    return [];
  }

  const { data, error } = await context.supabase
    .from("jastip_orders")
    .select("*")
    .or(`user_id.eq.${context.userId},status.eq.pending`)
    .order("created_at", { ascending: false });

  if (error) {
    return [];
  }

  const orders: JastipOrder[] = data ?? [];
  return orders;
}

export async function acceptJastipOrderAction(
  orderId: string,
): Promise<JastipActionResult> {
  const parsed = acceptJastipOrderSchema.safeParse({ orderId });
  if (!parsed.success) {
    return { status: "error", message: "ID pesanan tidak valid." };
  }

  const context = await getSessionContext();
  if (!context) {
    return SESSION_EXPIRED;
  }

  const { error } = await context.supabase
    .from("jastip_orders")
    .update({ status: "accepted", courier_id: context.userId })
    .eq("id", parsed.data.orderId)
    .eq("status", "pending");

  if (error) {
    return {
      status: "error",
      message: mapDatabaseError(
        error.message,
        "Gagal mengambil titipan. Silakan coba lagi.",
      ),
    };
  }

  revalidatePath(JASTIP_PATH);
  return { status: "success", message: "Pesanan berhasil diambil! 🛵" };
}

export async function updateJastipStatusAction(
  orderId: string,
  status: JastipProgressStatus,
): Promise<JastipActionResult> {
  const parsed = updateJastipStatusSchema.safeParse({ orderId, status });
  if (!parsed.success) {
    return { status: "error", message: "Status pesanan tidak valid." };
  }

  const context = await getSessionContext();
  if (!context) {
    return SESSION_EXPIRED;
  }

  const { error } = await context.supabase
    .from("jastip_orders")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.orderId)
    .eq("courier_id", context.userId);

  if (error) {
    return {
      status: "error",
      message: mapDatabaseError(
        error.message,
        "Gagal memperbarui status titipan. Silakan coba lagi.",
      ),
    };
  }

  revalidatePath(JASTIP_PATH);
  const message =
    parsed.data.status === "completed"
      ? "Pesanan selesai! Terima kasih 🎉"
      : "Pesanan sedang diantar 🛵";
  return { status: "success", message };
}
