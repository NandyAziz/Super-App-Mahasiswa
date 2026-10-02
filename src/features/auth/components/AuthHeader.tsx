import Image from "next/image";

interface AuthHeaderProps {
  title: string;
  subtitle: string;
}

/**
 * Header brand di dalam kartu putih autentikasi Campify.
 * Logo PNG transparan + judul slate gelap kontras tinggi.
 */
export function AuthHeader({ title, subtitle }: AuthHeaderProps) {
  return (
    <div className="flex flex-col items-center text-center">
      <Image
        src="/images/Campify.png"
        alt="Campify Logo"
        width={240}
        height={70}
        priority
        className="mx-auto mb-2 h-auto w-44 object-contain"
      />
      <h1 className="mb-1 text-2xl font-bold text-slate-900 text-center">
        {title}
      </h1>
      <p className="mb-6 text-sm text-slate-500 text-center">{subtitle}</p>
    </div>
  );
}
