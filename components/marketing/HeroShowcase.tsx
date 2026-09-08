import Image from "next/image";
import { cn } from "@/lib/utils";
import { PhoneShot } from "./PhoneShot";

/** Cartes réelles qui s'échappent du téléphone, mêmes images que dans l'application. */
const CARDS = [
  {
    src: "https://assets.tcgdex.net/fr/base/base1/4/high.webp",
    tilt: -8,
    delay: 0,
    className: "-right-3 top-[200px] w-[92px]",
  },
  {
    src: "https://assets.tcgdex.net/fr/ecard/ecard1/25/high.webp",
    tilt: 9,
    delay: 1.4,
    className: "right-7 top-[318px] w-[84px]",
  },
];

/**
 * Les deux vitrines du héros, sur des captures réelles de l'application : la
 * fiche d'une carte reconnue, puis le tableau de bord de la collection.
 * Panneaux plats, sans dégradé. Sur mobile ils défilent horizontalement avec
 * accroche, comme les captures d'un store.
 */
export function HeroShowcase() {
  return (
    <div className="no-scrollbar -mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-3 lg:mx-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:px-0">
      <Panel>
        <div className="h-[400px] w-full overflow-hidden">
          <PhoneShot
            src="/screenshots/result.webp"
            alt="Fiche d'une carte reconnue : Dracaufeu du Set de Base, cote de référence en euros, rareté et date de sortie"
            height={420}
            sizes="222px"
            priority
            className="mx-auto w-[222px]"
          />
        </div>
        <p className="mt-6 text-center text-[24px] font-black leading-[1.15] tracking-tight text-text-primary xl:text-[27px]">
          Connais la vraie
          <br />
          <span className="inline-block rounded-2xl bg-accent px-3 text-white">cote</span>
        </p>
      </Panel>

      <Panel>
        <span className="rounded-[18px] bg-accent px-5 py-1 text-[28px] font-black leading-tight tracking-tight text-white shadow-[0_12px_28px_rgba(79,95,230,0.35)] xl:text-[32px]">
          En euros
        </span>
        <p className="mt-3 text-center text-[24px] font-black leading-none tracking-tight text-text-primary xl:text-[27px]">
          Cotes Cardmarket
        </p>

        <div className="relative mt-6 h-[400px] w-full">
          <PhoneShot
            src="/screenshots/home.webp"
            alt="Tableau de bord : valeur totale de la collection, variation sur 30 jours et dernières cartes"
            height={420}
            sizes="232px"
            priority
            className="mx-auto w-[232px]"
          />
          {CARDS.map((c) => (
            <div
              key={c.src}
              aria-hidden
              className={cn("float-card absolute", c.className)}
              style={{ "--tilt": `${c.tilt}deg`, animationDelay: `${c.delay}s` } as React.CSSProperties}
            >
              <Image src={c.src} alt="" width={92} height={128} className="h-auto w-full rounded-[6px]" />
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative flex h-[560px] w-[78%] shrink-0 snap-center flex-col items-center overflow-hidden rounded-[32px] bg-[#f7f3ee] px-5 pt-6 sm:w-[60%] lg:w-auto",
        className,
      )}
    >
      {children}
    </div>
  );
}
