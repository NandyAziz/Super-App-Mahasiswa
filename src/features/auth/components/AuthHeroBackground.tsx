/**
 * Latar ambient profesional untuk halaman autentikasi Campify.
 * Tanpa blok ungu solid — hanya cahaya lembut di atas bg-slate-50
 * agar kartu putih tetap kontras dan bersih.
 */
export function AuthHeroBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute -top-24 -left-16 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="absolute -right-16 -bottom-24 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl" />
      <div className="absolute top-1/3 -right-10 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />
    </div>
  );
}
