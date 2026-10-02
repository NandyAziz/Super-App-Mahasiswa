import { createSupabaseServerClient } from "./server";

export interface CurrentUser {
  id: string;
  email: string | null;
}

/**
 * Mengambil user yang sedang login di sisi server (Server Component /
 * Server Action). Mengembalikan `null` bila belum terautentikasi,
 * env Supabase hilang, atau jaringan Supabase tidak dapat dijangkau
 * (`fetch failed`) — tidak pernah throw agar halaman tetap bisa dirender.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return null;
    }

    return { id: data.user.id, email: data.user.email ?? null };
  } catch {
    return null;
  }
}
