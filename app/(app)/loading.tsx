/**
 * Squelette affiché dès l'appui sur un onglet, avant que les données arrivent.
 * Il reprend la silhouette des pages (une grande carte, puis une liste) pour
 * que la transition se lise comme un chargement, pas comme un blocage.
 */
export default function AppLoading() {
  return (
    <div className="flex flex-col gap-4 py-2" aria-busy="true" aria-label="Chargement">
      <div className="glass-card-strong h-[318px] animate-pulse" />
      <div className="glass-card-strong flex flex-col gap-3 px-4 py-4">
        <div className="h-4 w-24 animate-pulse rounded-full bg-black/10" />
        <div className="glass-inner flex flex-col gap-3 px-4 py-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-4 flex-1 animate-pulse rounded-full bg-black/10" />
              <div className="h-[50px] w-9 animate-pulse rounded-md bg-black/10" />
              <div className="h-4 w-16 animate-pulse rounded-full bg-black/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
