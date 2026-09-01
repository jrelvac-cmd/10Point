const API_BASE = "https://api.pokemontcg.io/v2";

export type PokeTcgCard = {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  images: { small: string; large: string };
  set: { id: string; name: string; printedTotal: number; total: number };
  cardmarket?: {
    url?: string;
    updatedAt?: string;
    prices?: {
      lowPrice?: number;
      trendPrice?: number;
      averageSellPrice?: number;
      avg1?: number;
      avg7?: number;
      avg30?: number;
      reverseHoloLow?: number;
      reverseHoloTrend?: number;
      reverseHoloAvg1?: number;
      reverseHoloAvg7?: number;
      reverseHoloAvg30?: number;
    };
  };
};

function authHeaders(): Record<string, string> {
  return process.env.POKEMONTCG_API_KEY
    ? { "X-Api-Key": process.env.POKEMONTCG_API_KEY }
    : {};
}

/**
 * La PokéTCG API renvoie régulièrement des 500/502 transitoires : la même
 * requête peut échouer puis réussir à la seconde suivante. Sans réessai, un
 * scan sur deux échouerait. On retente donc les erreurs serveur et réseau
 * avec un backoff court, en restant sous les 60 s de la route.
 */
async function fetchWithRetry(url: string, attempts = 5): Promise<Response> {
  let lastError: unknown;

  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        headers: authHeaders(),
        signal: AbortSignal.timeout(8_000),
        cache: "no-store",
      });

      // 4xx = requête invalide, inutile d'insister.
      if (res.ok || (res.status >= 400 && res.status < 500)) return res;
      lastError = new Error(`POKETCG_${res.status}`);
    } catch (err) {
      lastError = err;
    }

    if (i < attempts - 1) {
      await new Promise((r) => setTimeout(r, 400 * 2 ** i));
    }
  }

  throw lastError instanceof Error ? lastError : new Error("POKETCG_UNAVAILABLE");
}

async function query(q: string, pageSize = 12): Promise<PokeTcgCard[]> {
  const url = `${API_BASE}/cards?q=${encodeURIComponent(q)}&pageSize=${pageSize}&orderBy=-set.releaseDate`;
  const res = await fetchWithRetry(url);

  if (!res.ok) throw new Error(`POKETCG_${res.status}`);

  const json = (await res.json()) as { data?: PokeTcgCard[] };
  return json.data ?? [];
}

/**
 * La PokéTCG API n'indexe que les noms anglais. Une carte française se retrouve
 * donc par son numéro + le total du set, qui sont identiques dans toutes les
 * langues. Le nom anglais (traduit par Claude) ne sert qu'à départager.
 */
export async function findCandidates(extraction: {
  name_en: string | null;
  number: string | null;
  set_total: string | null;
}): Promise<PokeTcgCard[]> {
  const { name_en, number, set_total } = extraction;
  // "025" et "25" désignent la même carte selon les sets : on interroge les deux.
  const numberVariants = number
    ? Array.from(new Set([number, number.replace(/^0+/, "")])).filter(Boolean)
    : [];

  if (numberVariants.length && set_total) {
    const numberClause = numberVariants.map((n) => `number:"${n}"`).join(" OR ");
    const byNumberAndSet = await query(
      `(${numberClause}) (set.printedTotal:${set_total} OR set.total:${set_total})`,
    );
    if (byNumberAndSet.length) return rank(byNumberAndSet, name_en, set_total);
  }

  if (numberVariants.length && name_en) {
    const numberClause = numberVariants.map((n) => `number:"${n}"`).join(" OR ");
    const byNumberAndName = await query(`(${numberClause}) name:"${name_en}"`);
    if (byNumberAndName.length) return rank(byNumberAndName, name_en, set_total);
  }

  if (name_en) {
    return rank(await query(`name:"${name_en}"`, 12), name_en, set_total);
  }

  return [];
}

/**
 * Classe les candidats du plus au moins probable plutôt que d'en écarter.
 * Deux signaux : la correspondance du nom anglais, et le fait que le total
 * imprimé colle exactement (set.total inclut les cartes secrètes, donc un set
 * imprimé en /101 peut matcher une recherche en /102 — d'où ce départage).
 */
function rank(
  cards: PokeTcgCard[],
  nameEn: string | null,
  setTotal: string | null,
): PokeTcgCard[] {
  if (cards.length <= 1) return cards;

  const wanted = nameEn?.toLowerCase().trim() ?? null;
  const total = setTotal ? Number(setTotal) : null;

  const score = (card: PokeTcgCard) => {
    let s = 0;
    if (wanted) {
      const name = card.name.toLowerCase();
      if (name === wanted) s += 100;
      else if (name.includes(wanted) || wanted.includes(name)) s += 60;
    }
    if (total !== null && card.set.printedTotal === total) s += 20;
    return s;
  };

  return [...cards].sort((a, b) => score(b) - score(a));
}

export async function getCardById(id: string): Promise<PokeTcgCard | null> {
  const headers: Record<string, string> = {};
  if (process.env.POKEMONTCG_API_KEY) {
    headers["X-Api-Key"] = process.env.POKEMONTCG_API_KEY;
  }

  const res = await fetch(`${API_BASE}/cards/${encodeURIComponent(id)}`, {
    headers,
    signal: AbortSignal.timeout(10_000),
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`POKETCG_${res.status}`);

  const json = (await res.json()) as { data?: PokeTcgCard };
  return json.data ?? null;
}
