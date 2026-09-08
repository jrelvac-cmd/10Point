import { ArrowUpRight, Check, Share, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { HoloCard } from "./HoloCard";
import { PhoneMockup } from "./PhoneMockup";

/**
 * Les deux vitrines du héros : la cote d'une carte reconnue, puis la
 * collection chiffrée. Panneaux plats, sans dégradé. Sur mobile ils défilent
 * horizontalement avec accroche, comme les captures d'un store.
 */
export function HeroShowcase() {
  return (
    <div className="no-scrollbar -mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-3 lg:mx-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:px-0">
      <Panel>
        <div className="h-[318px] w-full overflow-hidden">
          <div className="mx-auto w-[222px] rounded-[40px] border-[9px] border-[#161a3d] bg-[#161a3d] shadow-[0_30px_60px_rgba(20,25,90,0.25)]">
            <div className="rounded-[31px] bg-[#f3f4fb] px-3 pb-8 pt-3">
              <div className="mb-2 flex items-center justify-between px-1">
                <Share size={14} className="text-text-muted" />
                <span className="text-[11px] font-bold text-text-primary">Dracaufeu</span>
                <X size={14} className="text-text-muted" />
              </div>
              <HoloCard
                name="Dracaufeu"
                set="Set de Base · 4/102"
                price="533,88 €"
                variation="+6,2 %"
                hue={18}
                className="w-full !animate-none"
              />
              <div className="mt-3 flex gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-[10px] font-bold text-accent-dark">
                  <Check size={10} /> Holo
                </span>
                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-text-muted">
                  Reverse
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* La cote, posée sur le téléphone : elle cache la coupe du cadre. */}
        <div className="relative z-10 -mt-14 flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_18px_40px_rgba(28,33,96,0.18)]">
          <span
            aria-hidden
            className="holo-card w-10 shrink-0 !animate-none !shadow-none"
            style={{ "--hue": 18 } as React.CSSProperties}
          >
            <span className="holo-art" />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="text-[11px] font-semibold text-text-secondary">Cote Cardmarket</span>
            <span className="text-[26px] font-black leading-none tracking-tight text-text-primary">
              533<span className="text-text-muted">,88 €</span>
            </span>
            <span className="mt-1.5 flex items-center gap-2 text-[11px]">
              <span className="inline-flex items-center gap-0.5 rounded-md bg-up/15 px-1.5 py-0.5 font-bold text-up">
                <ArrowUpRight size={12} /> 6,2 %
              </span>
              <span className="font-medium text-text-secondary">Sur 30 jours</span>
            </span>
          </div>
        </div>

        <p className="mt-7 text-center text-[24px] font-black leading-[1.15] xl:text-[27px] tracking-tight text-text-primary">
          Connais la vraie
          <br />
          <span className="inline-block rounded-2xl bg-accent px-3 text-white">cote</span>
        </p>
      </Panel>

      <Panel>
        <span className="rounded-[18px] bg-accent px-5 py-1 text-[28px] font-black xl:text-[32px] leading-tight tracking-tight text-white shadow-[0_12px_28px_rgba(79,95,230,0.35)]">
          En euros
        </span>
        <p className="mt-3 text-center text-[24px] font-black leading-none xl:text-[27px] tracking-tight text-text-primary">
          Cotes Cardmarket
        </p>

        <div className="relative mt-6 h-[400px] w-full">
          {/* Le tableau de bord réel, rendu à sa taille puis réduit : sa mise en page ne change pas. */}
          <div className="mx-auto w-[232px]">
            <PhoneMockup className="w-[290px] origin-top-left scale-[0.8]" />
          </div>
          <div className="absolute -right-3 top-[205px] w-[92px]">
            <HoloCard name="Pikachu" set="58/102" price="15,45 €" variation="+80,5 %" hue={48} tilt={-8} />
          </div>
          <div className="absolute right-7 top-[318px] w-[84px]">
            <HoloCard name="Mewtwo" set="10/102" price="98,20 €" variation="−3,1 %" hue={268} tilt={9} delay={1.4} />
          </div>
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
