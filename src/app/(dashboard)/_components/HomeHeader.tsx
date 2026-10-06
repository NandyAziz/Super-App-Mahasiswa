import Link from "next/link";
import Image from "next/image";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { fetchUnreadNotificationCount } from "@/features/notifications/queries";
import { fetchWeatherBadge } from "@/lib/weather";
import { WeatherBadge } from "@/features/weather/components/WeatherBadge";

export async function HomeHeader() {
  // Badge dihitung di server agar akurat per user dan tidak berkedip saat mount.
  // Cuaca diambil paralel agar header tidak menunggu notifikasi.
  const [unreadCount, weather] = await Promise.all([
    fetchUnreadNotificationCount(),
    fetchWeatherBadge(),
  ]);

  return (
    <header className="flex items-center justify-between gap-3">
      <Link href="/" aria-label="Beranda Campify" className="flex items-center">
        <Image
          src="/images/Campify.png"
          alt="Campify Logo"
          width={280}
          height={80}
          priority
          className="h-9 w-auto min-w-30 object-contain"
        />
      </Link>

      <div className="flex items-center gap-2">
        <WeatherBadge initial={weather} />
        <NotificationBell initialCount={unreadCount} />

        <Link
          href="/profile"
          aria-label="Profil saya"
          className="shrink-0 transition-all duration-200 active:scale-95"
        >
          <Image
            src="/avatar-mahasiswa.svg"
            alt="Foto profil mahasiswa"
            width={40}
            height={40}
            unoptimized
            priority
            className="h-9 w-9 rounded-full border border-slate-200 object-cover"
          />
        </Link>
      </div>
    </header>
  );
}


