import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import {
  BadgeCheck,
  CheckCircle2,
  GraduationCap,
  ListChecks,
  Mail,
  TrendingUp,
} from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/auth";
import { fetchOrderSummaries } from "@/features/orders/queries";
import { AdminShortcut } from "@/features/profile/components/AdminShortcut";
import { LogoutButton } from "@/features/profile/components/LogoutButton";
import { ProfileSkeleton } from "@/features/profile/components/ProfileSkeleton";
import { ProfileStatTile } from "@/features/profile/components/ProfileStatTile";
import { fetchStudentProfile } from "@/features/profile/queries";
import { computeProfileStats } from "@/features/profile/stats";
import type { StudentProfile } from "@/features/profile/types";

export const metadata: Metadata = {
  title: "Profil Mahasiswa · Campify",
};

/** Hanya path lokal yang dipakai agar tidak perlu konfigurasi remote image. */
function isCustomAvatar(avatarUrl: string | null): boolean {
  return Boolean(avatarUrl && avatarUrl.startsWith("/"));
}

async function ProfileContent() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <p className="rounded-xl border border-slate-200/80 bg-white p-6 text-center text-sm text-slate-500 shadow-xs">
        Sesi berakhir. Silakan login kembali.
      </p>
    );
  }

  const [profile, orders] = await Promise.all([
    fetchStudentProfile(user.id),
    fetchOrderSummaries(),
  ]);

  const stats = computeProfileStats(orders);
  const identity: StudentProfile = profile ?? {
    fullName: "Mahasiswa",
    university: "-",
    avatarUrl: null,
    role: "user",
  };

  // Initials dari nama depan + belakang (jika ada).
  const nameParts = identity.fullName.trim().split(/\s+/);
  const initials =
    nameParts.length >= 2
      ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
      : nameParts[0]?.[0] ?? "?";

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-4">
          {isCustomAvatar(identity.avatarUrl) ? (
            <Image
              src={identity.avatarUrl as string}
              alt="Foto profil mahasiswa"
              width={64}
              height={64}
              unoptimized
              priority
              className="h-16 w-16 rounded-xl border border-slate-200 object-cover"
            />
          ) : (
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 text-white shadow-sm shadow-indigo-500/30">
              <span className="text-sm font-bold tracking-wide">{initials}</span>
            </span>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="truncate text-base font-semibold text-slate-900">
                {identity.fullName}
              </h2>
              <BadgeCheck className="h-4 w-4 shrink-0 text-indigo-500" />
            </div>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate">{user.email ?? "-"}</span>
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
              <GraduationCap className="h-3 w-3 shrink-0" />
              <span className="truncate">{identity.university}</span>
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">
          Statistik Aktivitas
        </h2>

        <div className="grid grid-cols-3 gap-2">
          <ProfileStatTile
            label="Total"
            value={String(stats.totalOrders)}
            icon={ListChecks}
          />
          <ProfileStatTile
            label="Berjalan"
            value={String(stats.activeOrders)}
            icon={TrendingUp}
          />
          <ProfileStatTile
            label="Selesai"
            value={String(stats.completedOrders)}
            icon={CheckCircle2}
          />
        </div>
      </section>

      {identity.role === "admin" ? <AdminShortcut /> : null}

      <LogoutButton />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <div className="flex flex-col gap-5 px-4 pt-5 pb-28">
      <header>
        <h1 className="text-lg font-semibold text-slate-900">Profil Mahasiswa</h1>
        <p className="text-xs text-slate-500">
          Kartu identitas kampus & ringkasan aktivitasmu.
        </p>
      </header>

      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileContent />
      </Suspense>
    </div>
  );
}
