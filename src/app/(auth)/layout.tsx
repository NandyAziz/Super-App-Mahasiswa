import { MobileFrame } from "@/components/layouts/MobileFrame";
import { AuthHeroBackground } from "@/features/auth/components/AuthHeroBackground";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-dvh w-full bg-slate-50">
      <MobileFrame className="relative overflow-hidden bg-slate-50">
        <main className="relative mx-auto flex w-full max-w-md flex-1 flex-col bg-slate-50 min-h-screen items-center justify-center p-4 overflow-hidden">
          <AuthHeroBackground />
          <div className="relative w-full">{children}</div>
        </main>
      </MobileFrame>
    </div>
  );
}
