import Image from "next/image";
import { HeroGauge } from "@/components/home/HeroGauge";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

const ROWS = [
  { name: "Dracaufeu", num: "4/102", price: "533,88 €", pct: "+6,2 %", hue: 18 },
  { name: "Pikachu", num: "58/102", price: "15,45 €", pct: "+80,5 %", hue: 48 },
  { name: "Drascore", num: "4/102", price: "2,43 €", pct: "−39,9 %", hue: 268 },
];

/**
 * Le tableau de bord réel, dans un cadre de téléphone, avec des données
 * d'exemple : ce que voit l'utilisateur une fois ses cartes scannées.
 */
export function PhoneMockup({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none select-none rounded-[44px] border-[10px] border-[#161a3d] bg-[#161a3d] shadow-[0_40px_80px_rgba(20,25,90,0.45)]",
        className,
      )}
    >
      <div className="overflow-hidden rounded-[34px] bg-[linear-gradient(180deg,#eceef8_0%,#d3d7f2_30%,#8f97e0_100%)] px-3 pb-4 pt-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <Image src="/icons/icon.svg" alt="" width={28} height={28} className="h-7 w-7" />
          <div className="flex items-center gap-1.5">
            <span className="rounded-full bg-white/90 px-2.5 py-1 text-[9px] font-bold tracking-wide text-text-primary">
              PRO
            </span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[9px] font-bold text-text-primary">
              JR
            </span>
          </div>
        </div>

        <HeroGauge
          totalValue={1284.5}
          gauge={{ up: 11, stable: 9, down: 4, total: 24 }}
          variation={{ eur: 96.4, pct: 8.1, days: 30 }}
          cardCount={24}
          distinctCount={19}
          plan="pro"
        />

        <section className="glass-card-strong mt-3 flex flex-col gap-2 px-3 pb-3 pt-3">
          <h3 className="px-1 text-[11px] font-bold text-text-primary">Mes Cartes</h3>
          <ol className="glass-inner flex flex-col divide-y divide-black/5 px-3">
            {ROWS.map((r) => (
              <li key={r.name} className="flex items-center gap-2 py-1.5">
                <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-text-primary">
                  {r.name}
                </span>
                <span className="text-[9px] text-text-secondary">{r.num}</span>
                <span
                  className="h-8 w-6 shrink-0 rounded-[3px] shadow-inner"
                  style={{
                    background: `linear-gradient(160deg, hsl(${r.hue} 70% 55%), hsl(${r.hue + 40} 70% 35%))`,
                  }}
                />
                <span className="flex w-[58px] shrink-0 flex-col items-end">
                  <span className="text-[11px] font-bold text-text-primary">{r.price}</span>
                  <span
                    className={cn(
                      "text-[9px] font-semibold",
                      r.pct.startsWith("+") ? "text-up" : "text-down",
                    )}
                  >
                    {r.pct}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <p className="mt-3 text-center text-[8px] text-text-muted">{APP_NAME} · données d&apos;exemple</p>
      </div>
    </div>
  );
}
