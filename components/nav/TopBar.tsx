import { APP_NAME } from "@/lib/constants";

export function TopBar({ initials }: { initials: string }) {
  return (
    <header className="flex items-center justify-between px-4 py-4">
      <span className="text-lg font-bold tracking-wide text-accent">{APP_NAME.toUpperCase()}</span>
      <div className="glass-card flex h-9 w-9 items-center justify-center text-xs font-medium text-text-primary">
        {initials}
      </div>
    </header>
  );
}
