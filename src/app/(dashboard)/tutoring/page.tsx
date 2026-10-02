import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getTutoringSessionsAction } from "@/features/tutoring/actions";
import { TutoringBoard } from "@/features/tutoring/components/TutoringBoard";
import { TutoringSkeleton } from "@/features/tutoring/components/TutoringSkeleton";
import { getDefaultScheduleValue } from "@/features/tutoring/schedule";

export const metadata: Metadata = {
  title: "Tutor Privat · Campify",
};

async function TutoringBoardLoader() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <p className="rounded-3xl border border-white/20 bg-white/70 p-6 text-center text-sm text-zinc-500 backdrop-blur-md">
        Sesi berakhir. Silakan login kembali.
      </p>
    );
  }

  const sessions = await getTutoringSessionsAction();

  return (
    <TutoringBoard
      sessions={sessions}
      defaultSchedule={getDefaultScheduleValue()}
      currentUserId={user.id}
    />
  );
}

export default function TutoringPage() {
  return (
    <div className="flex flex-col gap-5 px-5 pt-6 pb-24">
      <header className="flex items-center gap-3">
        <Link
          href="/"
          aria-label="Kembali ke beranda"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/70 text-zinc-600 shadow-sm backdrop-blur-md transition-all duration-200 active:scale-95"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">
            Tutor Privat Mahasiswa
          </h1>
          <p className="text-xs text-zinc-500">
            Reservasi tutor atau buka kelas untuk mahasiswa lain.
          </p>
        </div>
      </header>

      <Suspense fallback={<TutoringSkeleton />}>
        <TutoringBoardLoader />
      </Suspense>
    </div>
  );
}
