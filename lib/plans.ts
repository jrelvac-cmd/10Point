export type Plan = "free" | "pro" | "lifetime";

export const FREE_SCANS_PER_MONTH = 20;
export const FREE_COLLECTION_LIMIT = 100;
export const BULK_SESSION_MAX = 50;

export function isPro(plan: Plan): boolean {
  return plan === "pro" || plan === "lifetime";
}

export function scanQuotaFor(plan: Plan): number | null {
  return isPro(plan) ? null : FREE_SCANS_PER_MONTH;
}

export function collectionLimitFor(plan: Plan): number | null {
  return isPro(plan) ? null : FREE_COLLECTION_LIMIT;
}

export function remainingScans(plan: Plan, scansThisMonth: number): number | null {
  const quota = scanQuotaFor(plan);
  if (quota === null) return null;
  return Math.max(0, quota - scansThisMonth);
}

export function canScan(plan: Plan, scansThisMonth: number): boolean {
  const quota = scanQuotaFor(plan);
  return quota === null || scansThisMonth < quota;
}

export function canAddCard(plan: Plan, distinctCards: number): boolean {
  const limit = collectionLimitFor(plan);
  return limit === null || distinctCards < limit;
}
