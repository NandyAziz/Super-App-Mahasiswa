import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProfileRole, StudentProfile } from "./types";

type SupabaseServerClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;

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

/**
 * Mengambil pemetaan `id → full_name` dari `public.profiles` untuk sekumpulan
 * user id.
 *
 * Dipakai kartu tutoring & marketplace untuk menampilkan identitas pemesan /
 * pelaku, karena FK tabel layanan menunjuk `auth.users` (bukan `profiles`)
 * sehingga PostgREST tidak bisa meng-embed-nya dalam satu query.
 *
 * RLS `profiles_select` terbuka untuk pengguna terautentikasi
 * (`auth.uid() is not null`), jadi lookup ini sah. Kegagalan apa pun
 * menghasilkan Map kosong — pemanggil menampilkan fallback, bukan error.
 */
export async function fetchProfileNames(
  supabase: SupabaseServerClient,
  userIds: readonly (string | null | undefined)[],
): Promise<Map<string, string>> {
  const uniqueIds = [
    ...new Set(userIds.filter((id): id is string => Boolean(id))),
  ];

  if (uniqueIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", uniqueIds);

  if (error || !data) {
    return new Map();
  }

  const rows = data as { id: string; full_name: string | null }[];
  return new Map(
    rows
      .filter((row) => row.full_name !== null && row.full_name !== "")
      .map((row) => [row.id, row.full_name as string]),
  );
}
