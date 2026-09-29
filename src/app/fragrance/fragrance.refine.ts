// "Refine ranking": a session of pairwise questions about fragrances that are already ranked.
// Answers that contradict the ranking move the winner up in a draft order, which is only
// applied to the real list when the session is confirmed.

/** Pairs further apart than this are a big upset: the winner has to win a second time. */
export const NEAR_DISTANCE = 5;
/** Pairs are never further apart than this; beyond it the answer is obvious. */
export const FAR_DISTANCE = 30;
/** Share of questions that compare fragrances more than NEAR_DISTANCE places apart. */
const FAR_CHANCE = 0.25;
/** Each question starts from one of this many least recently compared fragrances. */
const STALE_POOL = 5;
/** A confirmation opponent is picked within this many places of the beaten fragrance. */
const CONFIRM_SPREAD = 2;

/** Returns a number in [0, 1), like Math.random. */
export type Random = () => number;

/** Last comparison time per fragrance id (ms since epoch). */
export type ComparisonTimes = Readonly<Record<string, number>>;

export interface RefinePair {
  /** Ranked higher in the draft when the pair was picked. */
  upper: string;
  lower: string;
  /** Card sides are randomised so the position does not hint at the current order. */
  upperOnLeft: boolean;
}

/** A lower fragrance beat one far above it; it gets a second opponent near there first. */
interface PendingUpset {
  winner: string;
  beaten: string;
  opponent: string;
}

export interface RefineSession {
  original: readonly string[];
  draft: readonly string[];
  /** The question being asked; `null` when there is nothing left to compare. */
  current: RefinePair | null;
  pending: PendingUpset | null;
  asked: readonly string[];
  /** Fragrances that took part in an answered (not skipped) question. */
  compared: readonly string[];
  answered: number;
  /** Fragrances moved up by an answer, in the order they were first moved. */
  promoted: readonly string[];
}

export type RefineAnswer = 'upper' | 'lower' | 'same' | 'skip';

export function startRefine(
  order: readonly string[],
  lastCompared: ComparisonTimes,
  random: Random = Math.random,
): RefineSession {
  const session: RefineSession = {
    original: order,
    draft: order,
    current: null,
    pending: null,
    asked: [],
    compared: [],
    answered: 0,
    promoted: [],
  };
  return withNextPair(session, lastCompared, random);
}

export function answerRefine(
  session: RefineSession,
  answer: RefineAnswer,
  lastCompared: ComparisonTimes,
  random: Random = Math.random,
): RefineSession {
  const pair = session.current;
  if (!pair) { return session; }

  let next: RefineSession = { ...session, asked: [...session.asked, pairKey(pair.upper, pair.lower)] };
  if (answer === 'skip') {
    return withNextPair({ ...next, pending: null }, lastCompared, random);
  }

  next = {
    ...next,
    answered: next.answered + 1,
    compared: unique([...next.compared, pair.upper, pair.lower]),
  };

  const pending = session.pending;
  if (pending && pair.lower === pending.winner && pair.upper === pending.opponent) {
    next = { ...next, pending: null };
    if (answer === 'lower') {
      // Won twice: it belongs above both fragrances it beat.
      next = promote(next, pending.winner, higherOf(next.draft, pending.beaten, pending.opponent));
    }
    return withNextPair(next, lastCompared, random);
  }

  if (answer === 'lower') {
    const distance = next.draft.indexOf(pair.lower) - next.draft.indexOf(pair.upper);
    const opponent =
      distance > NEAR_DISTANCE ? pickConfirmationOpponent(next, pair.lower, pair.upper, random) : null;
    next = opponent
      ? { ...next, pending: { winner: pair.lower, beaten: pair.upper, opponent } }
      : promote(next, pair.lower, pair.upper);
  }

  return withNextPair(next, lastCompared, random);
}

/** Moves in the draft compared with the original order, for promoted fragrances. */
export function refineMoves(session: RefineSession): { id: string; from: number; to: number }[] {
  return session.promoted
    .map((id) => ({
      id,
      from: session.original.indexOf(id) + 1,
      to: session.draft.indexOf(id) + 1,
    }))
    .filter((move) => move.from !== move.to)
    .sort((a, b) => a.to - b.to);
}

function withNextPair(
  session: RefineSession,
  lastCompared: ComparisonTimes,
  random: Random,
): RefineSession {
  const pending = session.pending;
  const current = pending
    ? { upper: pending.opponent, lower: pending.winner, upperOnLeft: random() < 0.5 }
    : pickPair(session, lastCompared, random);
  return { ...session, current };
}

function pickPair(
  session: RefineSession,
  lastCompared: ComparisonTimes,
  random: Random,
): RefinePair | null {
  const { draft } = session;
  const asked = new Set(session.asked);
  const comparedNow = new Set(session.compared);
  // Never compared counts as oldest; compared in this session counts as newest.
  const staleness = (id: string) =>
    comparedNow.has(id) ? Number.MAX_SAFE_INTEGER : (lastCompared[id] ?? 0);
  const byStaleness = [...draft].sort((a, b) => staleness(a) - staleness(b));

  const pool = byStaleness.slice(0, STALE_POOL);
  const first = pool[Math.floor(random() * pool.length)];
  const anchors = [first, ...byStaleness.filter((id) => id !== first)];

  for (const anchor of anchors) {
    const opponent = pickOpponent(draft, anchor, asked, random);
    if (opponent !== null) {
      const [upper, lower] =
        draft.indexOf(anchor) < draft.indexOf(opponent) ? [anchor, opponent] : [opponent, anchor];
      return { upper, lower, upperOnLeft: random() < 0.5 };
    }
  }
  return null;
}

function pickOpponent(
  draft: readonly string[],
  anchor: string,
  asked: ReadonlySet<string>,
  random: Random,
): string | null {
  const index = draft.indexOf(anchor);
  const band = (min: number, max: number) => {
    const ids: string[] = [];
    for (let distance = min; distance <= max; distance++) {
      for (const other of [index - distance, index + distance]) {
        const id = draft[other];
        if (id !== undefined && !asked.has(pairKey(anchor, id))) { ids.push(id); }
      }
    }
    return ids;
  };

  const near = band(1, NEAR_DISTANCE);
  const far = band(NEAR_DISTANCE + 1, FAR_DISTANCE);
  const [preferred, fallback] = random() < FAR_CHANCE ? [far, near] : [near, far];
  const choices = preferred.length > 0 ? preferred : fallback;
  return choices.length > 0 ? choices[Math.floor(random() * choices.length)] : null;
}

/** Another fragrance close to the beaten one, still ranked above the winner. */
function pickConfirmationOpponent(
  session: RefineSession,
  winner: string,
  beaten: string,
  random: Random,
): string | null {
  const { draft } = session;
  const asked = new Set(session.asked);
  const beatenIndex = draft.indexOf(beaten);
  const winnerIndex = draft.indexOf(winner);
  const choices: string[] = [];
  for (let i = beatenIndex - CONFIRM_SPREAD; i <= beatenIndex + CONFIRM_SPREAD; i++) {
    const id = draft[i];
    if (id !== undefined && id !== beaten && i < winnerIndex && !asked.has(pairKey(winner, id))) {
      choices.push(id);
    }
  }
  return choices.length > 0 ? choices[Math.floor(random() * choices.length)] : null;
}

/** Moves `winner` to directly above `above` in the draft. */
function promote(session: RefineSession, winner: string, above: string): RefineSession {
  const draft = session.draft.filter((id) => id !== winner);
  draft.splice(draft.indexOf(above), 0, winner);
  return { ...session, draft, promoted: unique([...session.promoted, winner]) };
}

function higherOf(draft: readonly string[], a: string, b: string): string {
  return draft.indexOf(a) < draft.indexOf(b) ? a : b;
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function unique(ids: readonly string[]): string[] {
  return [...new Set(ids)];
}
