/**
 * Détection d'une carte devant la caméra, sans modèle : on regarde si la zone
 * de cadrage contient un sujet net (variance du laplacien) et s'il est
 * immobile d'un échantillon à l'autre (différence moyenne entre deux images).
 * Tout se calcule sur une vignette de quelques milliers de pixels.
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

    this.still++;
    if (!this.armed) return { state: "parked", fire: false };
    if (this.still < STILL_SAMPLES) return { state: "holding", fire: false };
    this.armed = false;
    this.still = 0;
    return { state: "locked", fire: true };
  }
}
