"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface Promo {
  id: string;
  label: string;
  text: string;
  accent: string;
  gradient: string;
  image: string;
}

const PROMOS: Promo[] = [
  {
    id: "jastip-cepat",
    label: "Jastip Cepat",
    text: "Lagi Mager Keluar? Titip beli makanan & kebutuhan kampus lewatan Jastip Cepat!",
    accent: "bg-indigo-600",
    gradient: "from-indigo-50",
    image: "/images/mascot/bear-jastip.png",
  },
  {
    id: "proyek-it-tutor-privat",
    label: "Proyek IT & Tutor Privat",
    text: "Tugas Coding Error? Konsultasi bareng Tutor Privat & Tim Proyek IT!",
    accent: "bg-violet-600",
    gradient: "from-violet-50",
    image: "/images/mascot/bear-coding.png",
  },
  {
    id: "jasa-cetak-asisten-akademik",
    label: "Jasa Cetak & Asisten Akademik",
    text: "Ngeprint Dokumen & Bimbingan KRS Tanpa Antre, Serba Praktis!",
    accent: "bg-sky-600",
    gradient: "from-sky-50",
    image: "/images/mascot/bear-print.png",
  },
];

function findClosestIndex(track: HTMLDivElement): number {
  const cards = Array.from(track.children) as HTMLElement[];
  const center = track.scrollLeft + track.clientWidth / 2;

  return cards.reduce((closest, card, index) => {
    const closestCard = cards[closest];
    const cardCenter = card.offsetLeft + card.offsetWidth / 2;
    const closestCenter = closestCard.offsetLeft + closestCard.offsetWidth / 2;

    return Math.abs(cardCenter - center) < Math.abs(closestCenter - center)
      ? index
      : closest;
  }, 0);
}

function PromoCard({ promo }: { promo: Promo }) {
  return (
    <article
      className={cn(
        "flex w-[85%] shrink-0 snap-start items-center gap-3 overflow-hidden rounded-2xl border border-slate-200/80 bg-linear-to-br to-white p-4 shadow-xs",
        promo.gradient,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span
          className={cn(
            "w-fit rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold text-white",
            promo.accent,
          )}
        >
          {promo.label}
        </span>
        <p className="text-sm font-semibold text-slate-900">{promo.text}</p>
      </div>

      <Image
        src={promo.image}
        alt={`Maskot ${promo.label}`}
        width={80}
        height={80}
        className="h-16 w-16 shrink-0 object-contain drop-shadow-md"
      />
    </article>
  );
}

export function PromoCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  function handleScroll() {
    const track = scrollRef.current;
    if (!track) return;

    setActiveIndex(findClosestIndex(track));
  }

  return (
    <section
      aria-label="Promo layanan Campify"
      className="flex flex-col gap-2"
    >
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scrollbar-none px-4 py-2"
      >
        {PROMOS.map((promo) => (
          <PromoCard key={promo.id} promo={promo} />
        ))}
      </div>

      <div className="flex justify-center gap-1.5">
        {PROMOS.map((promo, index) => (
          <span
            key={promo.id}
            className={cn(
              "h-1.5 rounded-full transition-all duration-200",
              index === activeIndex ? "w-4 bg-indigo-600" : "w-1.5 bg-slate-300",
            )}
          />
        ))}
      </div>
    </section>
  );
}
