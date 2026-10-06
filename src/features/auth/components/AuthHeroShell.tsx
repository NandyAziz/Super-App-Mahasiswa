import Image from "next/image";

interface AuthHeroShellProps {
  /** Judul utama di dalam kartu putih, mis. "Selamat Datang Kembali". */
  title: string;
  /** Isi kartu (formulir + seksi OAuth). */
  children: React.ReactNode;
  /** Aksi yang menempel di dasar kartu (`mt-auto`), mis. tombol tamu. */
  footer?: React.ReactNode;
}

/**
 * Kerangka bersama halaman auth mobile bergaya Parcel — dipakai `/login` dan
 * `/register` agar tata letaknya DIJAMIN identik dan tidak pernah menyimpang:
 *
 * 1. `<header>` adalah kontainer flex penuh lebar (`w-full`) dengan gradasi
 *    slate/indigo semi-transparan yang menempel PADA ELEMEN HEADER ITU SENDIRI,
 *    sehingga gradasi membentang rata dari logo Campify di kiri sampai maskot
 *    beruang di kanan. Kedua anak langsungnya (logo & maskot) sengaja
 *    `bg-transparent` — tidak ada latar/gradasi lokal yang memotong gradasi
 *    induk.
 * 2. Kartu putih bersudut atas besar yang menindih header (`-mt-6`), berisi
 *    judul lalu `children`.
 * 3. `footer` opsional yang didorong ke dasar kartu dengan `mt-auto`.
 */
export function AuthHeroShell({
  title,
  children,
  footer,
}: AuthHeroShellProps) {
  return (
    <div className="flex w-full flex-1 flex-col bg-white">
      <header className="w-full bg-gradient-to-t from-slate-200 via-indigo-100/70 to-transparent pt-8 pb-6 px-6 flex justify-between items-start">
        {/* Kiri atas: logo Campify (emblem toga + wordmark). */}
        <div className="flex items-center gap-2.5 bg-transparent">
          <Image
            src="/icons/icon-192.png"
            alt=""
            width={192}
            height={192}
            priority
            className="h-10 w-10 rounded-2xl bg-transparent shadow-sm ring-1 ring-slate-200"
          />
          <span className="text-lg font-extrabold tracking-tight text-slate-900">
            Campify
          </span>
        </div>

        {/* Kanan bawah: maskot kurir 3D diperbesar & DILEKATKAN ke tepi bawah
            header. `self-end` meratakan maskot ke dasar (logo tetap di atas),
            `object-bottom` menginjakkan "kaki" maskot ke dasar kotaknya (GIF
            500x354 landscape = `object-contain` leaving letterbox atas/bawah),
            dan `-mb-4` menarik maskot sedikit menindih kartu putih di bawahnya
            agar tampak "duduk" tepat di atas kartu — bukan melayang. */}
        <Image
          src="/paket-removebg-preview.png"
          alt="Maskot kurir Campify"
          width={500}
          height={354}
          priority
          className="w-44 h-44 self-end -mb-4 bg-transparent object-contain object-bottom drop-shadow-[0_10px_18px_rgba(15,23,42,0.12)] md:w-48 md:h-48"
        />
      </header>

      {/* Kartu putih menindih header dengan sudut atas membulat besar. */}
      <section className="relative z-10 -mt-6 flex flex-1 flex-col rounded-t-[32px] bg-white p-6 shadow-2xl">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          {title}
        </h1>

        <div className="mt-6">{children}</div>

        {footer ? <div className="mt-auto pt-8">{footer}</div> : null}
      </section>
    </div>
  );
}
