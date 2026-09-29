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
}

/** How the placed fragrance compares to the current opponent. */
export type PlacementAnswer = 'better' | 'worse' | 'same';

export function startPlacement(otherCount: number): PlacementSearch {
  return settle(0, otherCount);
}

/** Index (among the other fragrances) of the one to compare against next. */
export function opponentIndex(search: PlacementSearch): number {
  return Math.floor((search.low + search.high) / 2);
}

export function answerPlacement(search: PlacementSearch, answer: PlacementAnswer): PlacementSearch {
  if (search.result !== null) { return search; }

  const opponent = opponentIndex(search);
  switch (answer) {
    case 'better':
      return settle(search.low, opponent);
    case 'worse':
      return settle(opponent + 1, search.high);
    case 'same':
      // Equal fragrances end up next to each other, right below the opponent.
      return settle(opponent + 1, opponent + 1);
  }
}

/** Upper bound on the number of answers needed to place among `otherCount` fragrances. */
export function maxPlacementQuestions(otherCount: number): number {
  return Math.ceil(Math.log2(otherCount + 1));
}

function settle(low: number, high: number): PlacementSearch {
  return { low, high, result: low === high ? low : null };
}
