"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Library, Settings, ScanLine } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/home", label: "Accueil", icon: Home },
  { href: "/collection", label: "Collection", icon: Library },
  { href: "/parametres", label: "Paramètres", icon: Settings },
];

/**
 * Barre inférieure d'après la maquette : une longue pastille givrée qui porte
 * les onglets, et à sa droite le bouton rond de scan, détaché.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-5 left-0 right-0 z-50 flex items-center gap-3 px-5">
      <div className="glass-card flex h-14 flex-1 items-center justify-around rounded-full px-2">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors",
                active
                  ? "bg-accent/15 text-accent-dark"
                  : "text-text-muted hover:text-text-secondary",
              )}
            >
              <Icon size={20} />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          );
        })}
      </div>

      <Link
        href="/scan"
        aria-label="Scanner une carte"
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#4F5FE6] text-white shadow-[0_10px_24px_rgba(79,95,230,0.45)] transition-transform hover:scale-105"
      >
        <ScanLine size={24} />
      </Link>
    </nav>
  );
}
