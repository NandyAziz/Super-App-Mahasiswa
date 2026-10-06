import { Truck } from "lucide-react";
import { formatRupiah } from "@/lib/format";
import {
  FREE_SHIPPING_BADGE,
  formatFreeShippingLabel,
  type FreeShippingStatus,
} from "../free-shipping";

interface FreeShippingBadgeProps {
  /** Status bebas ongkir milik pemesan; `null` = belum terhitung. */
  status: FreeShippingStatus | null;
  /** Nominal hemat (Rp) bila bebas ongkir memotong ongkir. */
  savedAmount?: number;
}

/**
 * Badge hijau bebas ongkir otomatis pada form checkout.
 *
 * Sengaja TIDAK merender apa pun saat `status` null / tidak eligible —
 * pemesan tidak boleh melihat janji gratis yang belum terverifikasi server.
 */
export function FreeShippingBadge({ status, savedAmount = 0 }: FreeShippingBadgeProps) {
  if (!status || !status.eligible) {
    return null;
  }

  const hasSaving = savedAmount > 0;

  return (
    <div
      className="flex items-start gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 p-3"
      role="status"
    >
      <Truck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-[0.65rem] font-semibold tracking-wide text-emerald-700">
          {FREE_SHIPPING_BADGE}
        </p>
        <p className="mt-0.5 text-[0.7rem] leading-relaxed font-medium text-emerald-800">
          {formatFreeShippingLabel(status.nextOrderNumber)}
        </p>
        {hasSaving ? (
          <p className="mt-1 text-[0.7rem] font-semibold text-emerald-700">
            Ongkir dihemat {formatRupiah(savedAmount)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
