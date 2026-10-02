"use client";

import { Modal } from "@/components/ui/Modal";
import { PrintForm } from "./PrintForm";

interface PrintFormModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Modal pembuatan pesanan cetak (bottom-sheet) yang membungkus `PrintForm`
 * agar form yang sama dipakai dari halaman `/printing`.
 */
export function PrintFormModal({ open, onClose }: PrintFormModalProps) {
  return (
    <Modal open={open} title="Buat Pesanan Cetak" onClose={onClose}>
      <PrintForm onSuccess={onClose} />
    </Modal>
  );
}
