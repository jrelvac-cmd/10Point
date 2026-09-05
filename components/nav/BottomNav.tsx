"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ScanLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { HomeIcon, LibraryIcon, SettingsIcon } from "./NavIcons";

const TABS = [
  { href: "/home", label: "Accueil", icon: HomeIcon },
  { href: "/collection", label: "Collection", icon: LibraryIcon },
  { href: "/parametres", label: "Paramètres", icon: SettingsIcon },
];

/**
 * Barre inférieure d'après la maquette : une longue pastille givrée qui porte
 * les onglets à parts égales, chacun avec son propre reflet quand actif, et
 * à sa droite le bouton rond de scan, détaché.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="nav-enter fixed bottom-5 left-0 right-0 z-50 flex items-center gap-3 px-5">
      <div className="glass-card flex h-14 flex-1 items-stretch gap-1 rounded-full p-1.5">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 items-center justify-center rounded-full transition-all active:scale-90",
                active ? "bg-white/15 shadow-inner" : "hover:bg-white/5",
              )}
            >
              <Icon active={active} className="h-6 w-6" />
            </Link>
          );
        })}
      </div>

      <Link
        href="/scan"
        aria-label="Scanner une carte"
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-[0_10px_24px_rgba(79,95,230,0.45)] transition-transform hover:scale-105"
      >
        <ScanLine size={24} />
      </Link>
    </nav>
  );
}
