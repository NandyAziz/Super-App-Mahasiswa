import { fetchUnreadNotificationCount } from "@/features/notifications/queries";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";

/**
 * Bell notifikasi untuk Header Admin — komponen & query yang SAMA dengan
 * Header utama (`HomeHeader`), sehingga indikator pesan baru (chat masuk /
 * perubahan status) tampil identik untuk operator.
 *
 * Dipisah sebagai Server Component kecil agar halaman `/admin` tetap bisa
 * me-render Suspense fallback bulat selagi count dihitung.
 */
export async function AdminHeaderBell() {
  const unreadCount = await fetchUnreadNotificationCount();

  return <NotificationBell initialCount={unreadCount} />;
}
