"use client";

import { toast } from "sonner";
import { loadMidtransSnapScript } from "@/lib/midtrans";
import { createMidtransSnapToken } from "./actions";
import { resolveCustomerInfo } from "./customer";
import type { PayableOrder, SnapItemDetail } from "./types";

interface StartSnapPaymentOptions {
  /**
   * Dipanggil setelah Snap selesai (sukses/menunggu) — dipakai pemanggil
   * untuk `router.refresh()` agar status pesanan terbaru langsung tampil.
   */
  onFinished?: () => void;
}

/**
 * Pemicu pembayaran **tanpa modal** dipakai form setelah pesanan dibuat:
 * memuat skrip `snap.js`, meminta token via Server Action
 * `createMidtransSnapToken`, lalu langsung menjalankan
 * `window.snap.pay(snapToken)` — langkah pembayaran tidak bisa dilewati
 * karena pesanan tetap `pending` sampai webhook Midtrans menandai lunas.
 *
 * Mengembalikan `false` bila pembayaran gagal dimulai (pesan ramah sudah
 * ditampilkan via toast); pesanan tetap bisa dibayar ulang dari `/orders`
 * atau `/jastip`.
 */
export async function startSnapPayment(
  order: PayableOrder,
  options: StartSnapPaymentOptions = {},
): Promise<boolean> {
  try {
    await loadMidtransSnapScript();

    const customerInfo = await resolveCustomerInfo();
    const itemDetails: SnapItemDetail[] = [
      { id: order.id, name: order.title, price: order.amount, quantity: 1 },
    ];
    const result = await createMidtransSnapToken(
      order.id,
      order.amount,
      customerInfo,
      itemDetails,
    );

    if (result.status === "error") {
      toast.error(result.message);
      return false;
    }

    const snap = window.snap;
    if (!snap) {
      toast.error("Pembayaran belum siap. Muat ulang halaman lalu coba lagi.");
      return false;
    }

    snap.pay(result.token, {
      onSuccess: (transaction) => {
        toast.success(
          `Pembayaran berhasil lewat ${transaction.payment_type}! Pesananmu segera diproses. 🎉`,
        );
        options.onFinished?.();
      },
      onPending: () => {
        toast.info(
          "Pembayaran sedang diproses. Status pesanan diperbarui otomatis.",
        );
        options.onFinished?.();
      },
      onError: (transaction) => {
        toast.error(
          transaction.status_message || "Pembayaran gagal. Silakan coba lagi.",
        );
      },
      onClose: () => {
        toast.info(
          "Jendela pembayaran ditutup. Pesanan tetap menunggu pembayaran.",
        );
      },
    });

    return true;
  } catch (cause) {
    toast.error(
      cause instanceof Error
        ? cause.message
        : "Gagal memulai pembayaran. Silakan coba lagi.",
    );
    return false;
  }
}
