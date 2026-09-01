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

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-4 left-0 right-0 z-50 flex items-center justify-center gap-3 px-4">
      <div className="flex items-center gap-1 rounded-full border border-glass-border bg-glass px-2 py-2 backdrop-blur-glass">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors",
                active ? "bg-accent/35 text-accent-light" : "text-text-muted hover:text-text-secondary",
              )}
            >
              <Icon size={18} />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          );
        })}
      </div>
      <Link
        href="/scan"
        aria-label="Scanner une carte"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-accent shadow-[0_0_24px_rgba(99,102,241,0.5)] transition-transform hover:scale-105"
      >
        <ScanLine className="text-white" size={24} />
      </Link>
    </nav>
  );
}
