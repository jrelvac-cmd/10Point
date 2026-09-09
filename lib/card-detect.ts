/**
 * Détection d'une carte devant la caméra, sans modèle : on regarde si la zone
 * de cadrage contient un sujet net (variance du laplacien), rectangulaire
 * (un bord rectiligne sur chacun des quatre côtés du cadre) et immobile d'un
 * échantillon à l'autre (différence moyenne entre deux images). Tout se
 * calcule sur une vignette de quelques milliers de pixels.
 */

export const SAMPLE_WIDTH = 96;
export const SAMPLE_HEIGHT = 134;

/**
 * Mouvement = différence moyenne entre deux vignettes, rapportée à leur
 * contraste local : cela mesure de combien la scène a glissé, indépendamment
 * du contenu de la carte. Mesuré sur une carte de test : tremblement de la
 * main ≈ 0,3–0,5 ; carte qui glisse de 5 % du cadre en un échantillon ≈ 1,0 ;
 * carte qui entre dans le champ ≈ 2 et plus.
 */
/** En dessous : la scène est tenue pour immobile. */
export const STILL_MAX = 0.5;
/** Au-dessus : quelque chose est passé devant la caméra, la détection se réarme. */
export const MOTION_MIN = 1;
/** Netteté minimale pour parler d'une carte et non d'un fond uni ou flou. */
export const SHARPNESS_MIN = 400;
/** Échantillons immobiles consécutifs avant de déclencher (≈ 600 ms à 150 ms). */
export const STILL_SAMPLES = 4;
export const SAMPLE_INTERVAL_MS = 150;

/**
 * Bord de carte = gradient signé moyen le long d'une ligne traversant la
 * vignette : la texture de l'illustration s'annule, un bord rectiligne
 * s'additionne. Mesuré sur une carte de test posée dans le cadre, droite ou
 * inclinée jusqu'à 6°, de 70 % à 115 % du cadre, sur fond sombre ou clair :
 * le plus faible des quatre côtés vaut 21 et plus. Un visage, une illustration
 * sans bord ou un mur : 10 au plus.
 */
export const EDGE_MIN = 16;
/**
 * Le bord doit aussi dominer le niveau médian du profil : une texture
 * uniformément contrastée (tissu, clavier) monte partout, pas seulement aux bords.
 */
export const EDGE_RATIO_MIN = 2;
/** Fraction de la vignette, depuis chaque côté, où le bord de la carte peut se trouver. */
const EDGE_BAND = 0.3;
/** Inclinaisons essayées, en tangente : la carte n'est jamais parfaitement droite dans le cadre. */
const TILTS = [-7, -4.5, -2, 0, 2, 4.5, 7].map((deg) => Math.tan((deg * Math.PI) / 180));

export function toGray(rgba: Uint8ClampedArray, out: Uint8ClampedArray) {
  for (let i = 0, j = 0; i < rgba.length; i += 4, j++) {
    out[j] = (rgba[i] * 77 + rgba[i + 1] * 151 + rgba[i + 2] * 28) >> 8;
  }
  return out;
}

/** Vignette réduite de moitié par moyenne 2×2 : le tremblement de la main y pèse deux fois moins. */
export function halve(gray: Uint8ClampedArray, width: number, height: number) {
  const w = width >> 1;
  const h = height >> 1;
  const out = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = 2 * y * width + 2 * x;
      out[y * w + x] = (gray[i] + gray[i + 1] + gray[i + width] + gray[i + width + 1]) >> 2;
    }
  }
  return out;
}

/** Différence moyenne par pixel entre deux vignettes de même taille. */
export function meanDifference(a: Uint8ClampedArray, b: Uint8ClampedArray) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum / a.length;
}

/** Contraste local moyen : à quel point les pixels voisins diffèrent. */
export function meanGradient(gray: Uint8ClampedArray, width: number, height: number) {
  let sum = 0;
  let n = 0;
  for (let y = 1; y < height; y++) {
    for (let x = 1; x < width; x++) {
      const i = y * width + x;
      sum += Math.abs(gray[i] - gray[i - 1]) + Math.abs(gray[i] - gray[i - width]);
      n++;
    }
  }
  return sum / n;
}

/** Déplacement apparent entre deux vignettes, en fraction de leur contraste local. */
export function motionBetween(a: Uint8ClampedArray, b: Uint8ClampedArray, width: number, height: number) {
  const contrast = (meanGradient(a, width, height) + meanGradient(b, width, height)) / 2;
  return meanDifference(a, b) / Math.max(1, contrast);
}

/** Variance du laplacien : élevée sur du texte et des contours nets, basse sur un fond uni ou flou. */
export function sharpness(gray: Uint8ClampedArray, width: number, height: number) {
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const lap = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - width] - gray[i + width];
      sum += lap;
      sumSq += lap * lap;
      n++;
    }
  }
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

/**
 * Pour chaque colonne (ou ligne si `vertical` est faux), la plus forte
 * moyenne du gradient signé le long d'une ligne quasi droite qui la traverse,
 * toutes inclinaisons confondues.
 */
export function lineProfile(gray: Uint8ClampedArray, width: number, height: number, vertical: boolean) {
  const positions = vertical ? width : height;
  const length = vertical ? height : width;
  const out = new Float32Array(positions);
  for (const tilt of TILTS) {
    for (let p = 1; p < positions; p++) {
      let sum = 0;
      let count = 0;
      for (let q = 0; q < length; q++) {
        const ps = p + Math.round((q - length / 2) * tilt);
        if (ps < 1 || ps >= positions) continue;
        const i = vertical ? q * width + ps : ps * width + q;
        sum += gray[i] - gray[vertical ? i - 1 : i - width];
        count++;
      }
      if (count > length * 0.8) out[p] = Math.max(out[p], Math.abs(sum) / count);
    }
  }
  return out;
}

function median(values: Float32Array) {
  const sorted = Float32Array.from(values).sort();
  return sorted[sorted.length >> 1];
}

/**
 * Le plus faible des quatre bords trouvés dans les bandes extérieures de la
 * vignette, et son rapport au niveau médian des profils.
 */
export function rectangleEdges(gray: Uint8ClampedArray, width: number, height: number) {
  const cols = lineProfile(gray, width, height, true);
  const rows = lineProfile(gray, width, height, false);
  const bandW = Math.round(width * EDGE_BAND);
  const bandH = Math.round(height * EDGE_BAND);
  const peak = (profile: Float32Array, from: number, to: number) => {
    let max = 0;
    for (let i = from; i < to; i++) max = Math.max(max, profile[i]);
    return max;
  };
  const weakest = Math.min(
    peak(cols, 1, bandW),
    peak(cols, width - bandW, width),
    peak(rows, 1, bandH),
    peak(rows, height - bandH, height),
  );
  const floor = Math.max(3, (median(cols) + median(rows)) / 2);
  return { weakest, ratio: weakest / floor };
}

export type DetectorState = "idle" | "holding" | "locked" | "parked";

/**
 * Machine d'états alimentée par une vignette à chaque échantillon.
 * `armed` : un mouvement a été vu depuis le dernier résultat, la prochaine
 * carte immobile déclenche. Sans cela, la carte laissée sous la caméra après
 * un résultat serait rescannée en boucle.
 */
export class CardDetector {
  private prev: Uint8ClampedArray | null = null;
  private still = 0;

  constructor(private armed: boolean) {}

  feed(gray: Uint8ClampedArray, width: number, height: number): { state: DetectorState; fire: boolean } {
    const small = halve(gray, width, height);
    const first = this.prev === null;
    const motion = first ? 0 : motionBetween(small, this.prev!, width >> 1, height >> 1);
    this.prev = small;
    // Le premier échantillon n'a rien à quoi se comparer : il ne dit rien du mouvement.
    if (first) return { state: "idle", fire: false };

    if (motion > MOTION_MIN) {
      this.armed = true;
      this.still = 0;
      return { state: "idle", fire: false };
    }
    if (motion > STILL_MAX) {
      this.still = 0;
      return { state: "idle", fire: false };
    }

    if (sharpness(gray, width, height) < SHARPNESS_MIN) {
      this.still = 0;
      return { state: "idle", fire: false };
    }

    // Net et immobile ne suffit pas : un visage tenu droit l'est aussi. Il faut un rectangle.
    const edges = rectangleEdges(gray, width, height);
    if (edges.weakest < EDGE_MIN || edges.ratio < EDGE_RATIO_MIN) {
      this.still = 0;
      return { state: "idle", fire: false };
    }

    this.still++;
    if (!this.armed) return { state: "parked", fire: false };
    if (this.still < STILL_SAMPLES) return { state: "holding", fire: false };
    this.armed = false;
    this.still = 0;
    return { state: "locked", fire: true };
  }
}
