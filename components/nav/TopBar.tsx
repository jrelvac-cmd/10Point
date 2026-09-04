import Image from "next/image";
import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import { isPro, type Plan } from "@/lib/plans";

export function TopBar({ initials, plan }: { initials: string; plan: Plan }) {
  const pro = isPro(plan);

  return (
    <header className="flex items-center justify-between px-4 py-4">
      <Link href="/home" aria-label={`${APP_NAME} — accueil`} className="flex items-center gap-2">
        <Image
          src="/icons/icon.svg"
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 rounded-xl shadow-inner"
          priority
        />
        <span className="text-sm font-extrabold tracking-tight text-text-primary">{APP_NAME}</span>
      </Link>

      <div className="flex items-center gap-2">
        {/* Le plan est cliquable : un compte gratuit arrive directement sur les offres. */}
        <Link
          href={pro ? "/parametres" : "/pricing"}
          className="glass-inner flex h-9 items-center rounded-full px-4 text-xs font-bold tracking-wide text-text-primary"
        >
          {pro ? "PRO" : "FREE"}
        </Link>
        <Link
          href="/parametres"
          aria-label="Paramètres du compte"
          className="glass-inner flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-text-primary"
        >
          {initials}
        </Link>
      </div>
    </header>
  );
}
