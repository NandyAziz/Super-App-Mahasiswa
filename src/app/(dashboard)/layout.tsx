import { BottomNav } from "@/components/layouts/BottomNav";
import { MobileFrame } from "@/components/layouts/MobileFrame";
import { WalkthroughModal } from "@/components/onboarding/WalkthroughModal";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-50/50">
      <MobileFrame className="flex-1 bg-slate-50/50">
        {/*
          `animate-reveal` memudarkan konten masuk dengan halus saat dashboard
          pertama tampil — termasuk momen kembali dari login OAuth, sehingga
          perpindahan ke `/` terasa mulus seperti aplikasi native.
        */}
        <main className="animate-reveal flex flex-1 flex-col">{children}</main>
      </MobileFrame>
      <BottomNav />
      <WalkthroughModal />
    </div>
  );
}
