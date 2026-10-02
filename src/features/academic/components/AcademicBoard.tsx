"use client";

import { BookOpenCheck } from "lucide-react";
import type { AcademicService } from "../types";
import { AcademicCard } from "./AcademicCard";

interface AcademicBoardProps {
  services: AcademicService[];
}

/**
 * Daftar riwayat pengajuan bantuan akademik. Form pengajuan kini dirender
 * inline di halaman `/academic`, sehingga board ini hanya menampilkan riwayat.
 */
export function AcademicBoard({ services }: AcademicBoardProps) {
  if (services.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-zinc-200 bg-white/60 px-6 py-10 text-center backdrop-blur-md">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
          <BookOpenCheck className="h-6 w-6" />
        </span>
        <p className="text-sm text-zinc-500">
          Belum ada pengajuan. Yuk ajukan bantuan pertamamu!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {services.map((service) => (
        <AcademicCard key={service.id} service={service} />
      ))}
    </div>
  );
}
