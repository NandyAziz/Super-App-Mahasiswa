"use client";

import { Modal } from "@/components/ui/Modal";
import type { FreeShippingStatus } from "@/features/orders/free-shipping";
import type { AppliedPromo } from "@/features/promos/catalog";
import { PrintForm } from "./PrintForm";

interface PrintFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Promo terverifikasi dari halaman (hasil parsing `?promo=`). */
  appliedPromo?: AppliedPromo | null;
  /** Status bebas ongkir otomatis; null bila belum terhitung. */
  freeShipping?: FreeShippingStatus | null;
}

/**
 * Modal pembuatan pesanan cetak (bottom-sheet) yang membungkus `PrintForm`
 * agar form yang sama dipakai dari halaman `/printing`.
 */
export function PrintFormModal({ open, onClose, appliedPromo, freeShipping = null }: PrintFormModalProps) {
  return (
    <Modal open={open} title="Buat Pesanan Cetak" onClose={onClose}>
      <PrintForm onSuccess={onClose} appliedPromo={appliedPromo ?? null} freeShipping={freeShipping} />
    </Modal>
  );
}
