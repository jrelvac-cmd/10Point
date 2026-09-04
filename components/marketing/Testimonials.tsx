import { Star } from "lucide-react";
import { TESTIMONIALS } from "@/lib/testimonials";
import { Reveal } from "./Reveal";

export function Testimonials() {
  if (!TESTIMONIALS.length) return null;

  return (
    <section className="mx-auto w-full max-w-5xl px-6 pb-20">
      <Reveal>
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_10px_rgba(28,33,96,0.4)]">
          Ce qu&apos;en disent les collectionneurs
        </h2>
      </Reveal>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {TESTIMONIALS.map((t, i) => (
          <Reveal key={i} delay={i * 120}>
            <figure className="glass-card-strong relative flex h-full flex-col gap-3 px-5 py-6 transition-transform duration-300 hover:-translate-y-1">
              {t.placeholder && (
                <span className="absolute right-4 top-4 rounded-full bg-warn/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-warn">
                  Exemple
                </span>
              )}
              <div className="flex gap-0.5" aria-label={`${t.rating} sur 5`}>
                {Array.from({ length: 5 }, (_, k) => (
                  <Star
                    key={k}
                    size={14}
                    className={k < t.rating ? "fill-amber-400 text-amber-400" : "text-black/15"}
                  />
                ))}
              </div>
              <blockquote className="text-sm leading-relaxed text-text-primary">« {t.text} »</blockquote>
              <figcaption className="mt-auto flex items-center gap-3 pt-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent-dark">
                  {t.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-semibold text-text-primary">{t.name}</span>
                  <span className="text-[11px] text-text-muted">{t.role}</span>
                </span>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
