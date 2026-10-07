import { HeroPromoBanner } from "./_components/HeroPromoBanner";
import { HomeHeader } from "./_components/HomeHeader";
import { HomeMenuGrid } from "./_components/HomeMenuGrid";
import { PromoCarousel } from "./_components/PromoCarousel";

export default function DashboardHomePage() {
  return (
    <div className="flex min-h-screen flex-col gap-5 bg-slate-50/50 px-4 pt-5 pb-28">
      <HomeHeader />
      <HeroPromoBanner />
      <HomeMenuGrid />
      <PromoCarousel />
    </div>
  );
}


