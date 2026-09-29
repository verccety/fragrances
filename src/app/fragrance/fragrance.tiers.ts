// Tiers group the ranking into bands by position. They are derived from the rank alone,
// so nothing is stored and every reorder updates them automatically.

export const TIERS = [
  { id: 'top10', label: 'Top 10', lastRank: 10 },
  { id: 'top25', label: 'Top 25', lastRank: 25 },
  { id: 'top50', label: 'Top 50', lastRank: 50 },
  { id: 'rest', label: 'The rest', lastRank: Infinity },
] as const;

export type Tier = (typeof TIERS)[number];
export type TierId = Tier['id'];

/** The tier of a 1-based rank. */
export function tierForRank(rank: number): Tier {
  return TIERS.find((tier) => rank <= tier.lastRank) ?? TIERS[TIERS.length - 1];
}

/** The tier that begins at this rank, or `null` when the rank is inside a tier. */
export function tierStartingAt(rank: number): Tier | null {
  const tier = tierForRank(rank);
  return rank === 1 || tierForRank(rank - 1) !== tier ? tier : null;
}

/** "Top 25 → Top 10" when a move crosses a tier boundary, otherwise `null`. */
export function tierChange(fromRank: number, toRank: number): string | null {
  const from = tierForRank(fromRank);
  const to = tierForRank(toRank);
  return from === to ? null : `${from.label} → ${to.label}`;
}
