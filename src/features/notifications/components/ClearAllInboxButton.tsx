"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import {
  clearAllMessagesAction,
  clearAllNotificationsAction,
} from "@/features/notifications/actions";

/**
 * Tombol "Hapus Semua" untuk `/inbox`.
 *
 * SATU tombol untuk SATU tampilan: halaman `/inbox` menampilkan notifikasi
 * DAN pesan dalam satu daftar gabungan, sehingga dua tombol "Hapus Semua"
 * hanya akan membingungkan (terlihat duplikat). Tombol ini karena itu
 * membersihkan keduanya sekaligus.
 *
 * Alur: klik → modal konfirmasi → hapus di server (HANYA baris milik user
 * login) → toast konfirmasi + `router.refresh()`.
 *
 * Optimistik: tombol langsung nonaktif dan berpindah ke status "Diproses…"
 * segera setelah konfirmasi. Daftar dirender ulang server lewat
 * `router.refresh()`.
 */
export function ClearAllInboxButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm(): void {
    setIsOpen(false);

    // Optimistik: kunci tombol sebelum request berjalan.
    startTransition(async () => {
      const [notifications, messages] = await Promise.all([
        clearAllNotificationsAction(),
        clearAllMessagesAction(),
      ]);

      if (notifications < 0 || messages < 0) {
        toast.error("Gagal menghapus. Silakan coba lagi.");
        router.refresh();
        return;
      }

      const total = notifications + messages;
      toast.success(
        total > 0
          ? `${total} notifikasi & pesan berhasil dihapus.`
          : "Tidak ada notifikasi atau pesan untuk dihapus.",
      );
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={isPending}
        aria-label="Hapus Semua Notifikasi & Pesan"
        className="flex shrink-0 items-center gap-1.5 rounded-2xl border border-rose-200 bg-white/70 px-3 py-2 text-[0.7rem] font-semibold text-rose-600 shadow-sm backdrop-blur-md transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
        <span>{isPending ? "Diproses…" : "Hapus Semua"}</span>
      </button>

      <Modal
        open={isOpen}
        title="Hapus Semua Notifikasi & Pesan"
        onClose={() => setIsOpen(false)}
      >
        <p className="text-sm text-zinc-600">
          Apakah Anda yakin ingin menghapus semua notifikasi dan pesan Anda?
        </p>
        <p className="mt-2 text-xs text-zinc-400">
          Notifikasi akan dihapus permanen. Untuk pesan, hanya pesan yang Anda
          KIRIM yang terhapus — pesan dari operator serta admin tetap tersimpan
          agar riwayat percakapan tidak rusak.
        </p>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-600 transition-all duration-200 active:scale-95"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-rose-500/30 transition-all duration-200 active:scale-95"
          >
            <Trash2 className="h-4 w-4" />
            <span>Hapus Semua</span>
          </button>
        </div>
      </Modal>
    </>
  );
}