export default function ScanLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3" aria-busy="true" aria-label="Chargement">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="h-4 w-36 animate-pulse rounded-full bg-black/10" />
          <div className="h-3 w-20 animate-pulse rounded-full bg-black/10" />
        </div>
        <div className="h-10 w-10 animate-pulse rounded-full bg-white/70" />
      </div>
      <div className="min-h-0 flex-1 animate-pulse rounded-[28px] bg-[#101438]/80" />
    </div>
  );
}
