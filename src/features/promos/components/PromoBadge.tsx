import { Ticket } from "lucide-react";
import { formatRupiah } from "@/lib/format";
import type { AppliedPromo } from "../catalog";

interface PromoBadgeProps {
  /** Promo yang sudah diverifikasi server; `null` = tidak ada promo aktif. */
  promo: AppliedPromo | null;
  /** Nominal hemat (Rp) bila promo memotong ongkir; 0/absent untuk klaim. */
  savedAmount?: number;
}

/**
 * Badge promo aktif pada form.
 *
 * Sengaja TIDAK merender apa pun saat `promo` null — pemesan tidak boleh
 * melihat badge diskon yang belum terverifikasi server (mis. hanya karena
 * mengetik URL secara manual).
 *
 * Bila ada nominal hemat, nilai yang ditampilkan adalah hasil hitungan
 * server, bukan input pengguna.
 */
export function PromoBadge({ promo, savedAmount = 0 }: PromoBadgeProps) {
  if (!promo) {
    return null;
  }

  const hasSaving = savedAmount > 0;

  return (
    <div
      className="flex items-start gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 p-3"
      role="status"
    >
      <Ticket
        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-[0.65rem] font-semibold tracking-wide text-emerald-700">
          {promo.badge} · {promo.code}
        </p>
        <p className="mt-0.5 text-[0.7rem] leading-relaxed text-emerald-800">
          {promo.summary}
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
