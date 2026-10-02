import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProfileRole, StudentProfile } from "./types";

interface ProfileRow {
  full_name: string | null;
  university: string | null;
  avatar_url: string | null;
  role: ProfileRole | null;
}

/** Menormalkan nilai `role` dari database; selain `admin` dianggap `user`. */
function toProfileRole(value: unknown): ProfileRole {
  return value === "admin" ? "admin" : "user";
}

/** Mengambil identitas mahasiswa dari tabel `public.profiles`. */
export async function fetchStudentProfile(
  userId: string,
): Promise<StudentProfile | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, university, avatar_url, role")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as ProfileRow;

  return {
    fullName: row.full_name ?? "Mahasiswa",
    university: row.university ?? "-",
    avatarUrl: row.avatar_url ?? null,
    role: toProfileRole(row.role),
  };
}

/**
 * Mengambil peran pengguna saja untuk guard server-side (halaman `/admin` &
 * Server Action operator). Bila gagal membaca (error / baris tidak ada),
 * hasilnya `user` sehingga akses operator tertutup secara default (fail-safe).
 */
export async function fetchProfileRole(userId: string): Promise<ProfileRole> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return "user";
  }

  const row = data as { role: ProfileRole | null };
  return toProfileRole(row.role);
}
