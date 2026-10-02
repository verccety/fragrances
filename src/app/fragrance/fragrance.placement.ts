import { Random } from './random';

// Binary search for where one fragrance belongs in the ranking, driven by
// "which do you like more?" answers against the other fragrances.

/**
 * Positions are insertion indexes into the ranking *without* the placed fragrance:
 * 0 is the top, `count` is the bottom. `result` is set once the position is known.
 */
export interface PlacementSearch {
  low: number;
  high: number;
  result: number | null;
  /** Index (among the other fragrances) to compare against next; `null` once settled. */
  opponent: number | null;
}

/** How the placed fragrance compares to the current opponent. */
export type PlacementAnswer = 'better' | 'worse' | 'same';

export function startPlacement(otherCount: number, random: Random = Math.random): PlacementSearch {
  return settle(0, otherCount, random);
}

export function answerPlacement(
  search: PlacementSearch,
  answer: PlacementAnswer,
  random: Random = Math.random,
): PlacementSearch {
  const opponent = search.opponent;
  if (search.result !== null || opponent === null) { return search; }

  switch (answer) {
    case 'better':
      return settle(search.low, opponent, random);
    case 'worse':
      return settle(opponent + 1, search.high, random);
    case 'same':
      // Equal fragrances end up next to each other, right below the opponent.
      return settle(opponent + 1, opponent + 1, random);
  }
}

/**
 * Typical number of answers needed to place among `otherCount` fragrances. Opponents are
 * picked near the middle rather than exactly at it, so a search can occasionally need more.
 */
export function typicalPlacementQuestions(otherCount: number): number {
  return Math.ceil(Math.log2(otherCount + 1));
}

function settle(low: number, high: number, random: Random): PlacementSearch {
  return low === high
    ? { low, high, result: low, opponent: null }
    : { low, high, result: null, opponent: pickOpponent(low, high, random) };
}

/**
 * A random opponent from the middle third of the remaining range. Each answer still rules
 * out at least a third of it, so searches stay short, but opponents vary between searches
 * instead of always being the exact middle.
 */
function pickOpponent(low: number, high: number, random: Random): number {
  const third = Math.floor((high - low) / 3);
  const first = low + third;
  const last = high - 1 - third;
  return first + Math.floor(random() * (last - first + 1));
}
