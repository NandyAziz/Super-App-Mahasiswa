import type { User } from "@supabase/supabase-js";
import { mapDatabaseError } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;

export type EnsureUserProfileResult =
  | { ok: true }
  | { ok: false; message: string };

/** Nama default saat metadata pendaftaran tidak menyertakan `full_name`. */
const DEFAULT_FULL_NAME = "Mahasiswa";

/** Kampus default saat metadata pendaftaran tidak menyertakan `university`. */
const DEFAULT_UNIVERSITY = "Kampus";

const PROFILE_SYNC_FALLBACK =
  "Gagal menyiapkan profil pengguna. Silakan login ulang lalu coba lagi.";

/** Menampilkan error DB asli ke console server agar masalah skema/RLS terlihat. */
function logProfileSyncError(stage: string, error: unknown): void {
  console.error("[Profile Sync Error]", stage, error);
}

/** Membaca nilai metadata sebagai string tak-kosong, atau `null`. */
function readMetadataString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Membangun kolom inti profil sesuai skema final `public.profiles`
 * (`id`, `full_name`, `university`). Kolom `email` sengaja TIDAK diikutkan
 * karena tabel tidak memakainya. Kolom `role` juga TIDAK ditulis di sini:
 * biarkan nilai default database (`'user'`) yang berlaku agar pengguna tidak
 * dapat menaikkan perannya sendiri menjadi `admin`.
 */
function buildCoreProfile(user: User): Record<string, unknown> {
  const metadata = user.user_metadata ?? {};
  const fullName = readMetadataString(metadata.full_name) ?? DEFAULT_FULL_NAME;
  const university =
    readMetadataString(metadata.university) ?? DEFAULT_UNIVERSITY;

  return {
    id: user.id,
    full_name: fullName,
    university,
  };
}

/** Payload minimal (tanpa `updated_at`) sebagai fallback terakhir. */
function buildMinimalProfile(user: User): Record<string, unknown> {
  return buildCoreProfile(user);
}

/**
 * Menyusun payload dari paling lengkap ke paling minimal.
 *
 * Payload utama memakai seluruh kolom `public.profiles` (`id`, `full_name`,
 * `university`, `updated_at`). Payload minimal tanpa `updated_at` dipakai
 * sebagai fallback terakhir bila kolom tersebut tidak tersedia pada skema.
 */
function buildProfilePayloads(user: User): Record<string, unknown>[] {
  const minimal = buildMinimalProfile(user);
  const primary: Record<string, unknown> = {
    ...minimal,
    updated_at: new Date().toISOString(),
  };

  return [primary, minimal];
}

/** Cek keberadaan baris profil; error SELECT dicatat namun tidak melempar. */
async function hasProfileRow(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    logProfileSyncError("select", error);
    return false;
  }

  return Boolean(data);
}

/**
 * Mencoba `upsert` idempoten berurutan (payload lengkap → minimal).
 * Setiap kegagalan di-log dengan error DB asli.
 */
async function tryUpsertProfiles(
  supabase: SupabaseServerClient,
  payloads: Record<string, unknown>[],
): Promise<{ ok: boolean; message: string }> {
  let message = PROFILE_SYNC_FALLBACK;

  for (const payload of payloads) {
    const { error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" });

    if (!error) {
      return { ok: true, message: "" };
    }

    message = mapDatabaseError(error.message, PROFILE_SYNC_FALLBACK);
    logProfileSyncError(`upsert(${Object.keys(payload).join(", ")})`, error);
  }

  return { ok: false, message };
}

/**
 * Fallback terakhir: `INSERT` murni.
 *
 * Berbeda dengan `upsert` (`INSERT ... ON CONFLICT DO UPDATE`), `INSERT` hanya
 * membutuhkan kebijakan RLS INSERT — berguna ketika tabel profil belum punya
 * kebijakan UPDATE. Kolom `id` selalu disamakan dengan `auth.uid()` user yang
 * terautentikasi sehingga tetap aman & sesuai isolasi data.
 */
async function tryInsertProfile(
  supabase: SupabaseServerClient,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; message: string }> {
  const { error } = await supabase.from("profiles").insert(payload);

  if (!error) {
    return { ok: true, message: "" };
  }

  logProfileSyncError("insert(minimal)", error);
  return {
    ok: false,
    message: mapDatabaseError(error.message, PROFILE_SYNC_FALLBACK),
  };
}

/**
 * Memastikan baris `public.profiles` untuk user terautentikasi sudah ada.
 *
 * User yang baru mendaftar bisa saja belum memiliki baris profil (mis. trigger
 * `on_auth_user_created` belum berjalan), sehingga INSERT ke tabel pesanan
 * (`jastip_orders`, `coding_projects`, dst.) gagal dengan error foreign key
 * (`*_user_id_fkey` / `*_client_id_fkey`). Karena itu sebelum menulis data kita
 * memverifikasi keberadaan profil lalu membuatnya secara idempoten sehingga FK
 * selalu dapat terpenuhi — tanpa pernah membuat data duplikat.
 *
 * Bila seluruh strategi gagal, fungsi ini TIDAK melempar: error DB asli
 * di-log ke console server dan hasil `{ ok: false }` dikembalikan agar Server
 * Action tetap dapat melanjutkan operasi memakai `auth.uid()`.
 */
export async function ensureUserProfile(
  supabase: SupabaseServerClient,
  user: User,
): Promise<EnsureUserProfileResult> {
  if (await hasProfileRow(supabase, user.id)) {
    return { ok: true };
  }

  const upsert = await tryUpsertProfiles(supabase, buildProfilePayloads(user));
  if (upsert.ok) {
    return { ok: true };
  }

  const insert = await tryInsertProfile(supabase, buildMinimalProfile(user));
  if (insert.ok) {
    return { ok: true };
  }

  return { ok: false, message: insert.message || upsert.message };
}
