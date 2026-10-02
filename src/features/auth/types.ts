/** Hasil standar yang dikembalikan oleh seluruh Server Action autentikasi. */
export interface AuthActionResult {
  status: "success" | "error";
  message: string;
  /** Bila diisi, client akan melakukan navigasi ke path ini setelah sukses. */
  redirectTo?: string;
  /** Pesan error per-field untuk ditampilkan di bawah input. */
  fieldErrors?: Record<string, string>;
}
