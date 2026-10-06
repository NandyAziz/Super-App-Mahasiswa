"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Loader2, Search } from "lucide-react";
import { TextField } from "@/components/ui/TextField";
import { publicTrackOrderSchema } from "../schemas";

interface PublicTrackFormProps {
  /** Nilai awal dari `?id=` agar input tetap terisi setelah pencarian. */
  initialOrderId?: string;
}

/**
 * Form pelacakan pesanan publik.
 *
 * Hasil pelacakan sengaja ditaruh di URL (`/track?id=<uuid>`) sehingga tautan
 * dapat dibagikan/di-bookmark dan halaman tetap berfungsi tanpa JavaScript.
 * Setelah navigasi, Server Component di bawahnya menampilkan skeleton lalu
 * hasil sebenarnya.
 */
export function PublicTrackForm({ initialOrderId = "" }: PublicTrackFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(initialOrderId);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const parsed = publicTrackOrderSchema.safeParse({ orderId: value });
    if (!parsed.success) {
      setError(
        parsed.error.issues[0]?.message ?? "ID pesanan tidak valid.",
      );
      return;
    }

    setError(null);
    startTransition(() => {
      router.push(`/track?id=${parsed.data.orderId}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate autoComplete="off" className="space-y-3">
      <TextField
        id="order-id"
        name="orderId"
        label="ID Pesanan"
        placeholder="550e8400-e29b-41d4-a716-446655440000"
        icon={Search}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          if (error) {
            setError(null);
          }
        }}
        error={error}
        hint="Tempel ID pesanan atau seluruh tautan pesanan yang kamu terima."
        autoCapitalize="none"
        spellCheck={false}
        disabled={isPending}
      />

      <button
        type="submit"
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 font-semibold text-white shadow-md shadow-indigo-200 transition-all duration-200 hover:bg-indigo-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Search className="h-4 w-4" />
        )}
        <span>{isPending ? "Melacak..." : "Lacak Pesanan"}</span>
      </button>
    </form>
  );
}
