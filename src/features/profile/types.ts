/** Peran pengguna pada `public.profiles` (kolom `role`). */
export type ProfileRole = "user" | "admin";

/** Identitas mahasiswa gabungan `auth.users` + tabel `public.profiles`. */
export interface StudentProfile {
  fullName: string;
  university: string;
  avatarUrl: string | null;
  role: ProfileRole;
}

/** Ringkasan statistik aktivitas mahasiswa di Campify. */
export interface ProfileStats {
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
}
