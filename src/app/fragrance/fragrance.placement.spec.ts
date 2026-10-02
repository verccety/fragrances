import {
  PlacementAnswer,
  PlacementSearch,
  answerPlacement,
  startPlacement,
  typicalPlacementQuestions,
} from './fragrance.placement';
import { Random } from './random';

const always = (value: number): Random => () => value;

/** Small deterministic PRNG so property tests are repeatable. */
function seeded(seed: number): Random {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Answers every question as if the fragrance truly belongs at `target`, returning the outcome. */
function placeAt(
  otherCount: number,
  target: number,
  random: Random,
): { result: number | null; questions: number } {
  let search = startPlacement(otherCount, random);
  let questions = 0;
  while (search.result === null) {
    const answer: PlacementAnswer = target <= search.opponent! ? 'better' : 'worse';
    search = answerPlacement(search, answer, random);
    questions++;
  }
  return { result: search.result, questions };
}

describe('fragrance placement', () => {
  it('is settled immediately when there is nothing to compare with', () => {
    expect(startPlacement(0)).toEqual({ low: 0, high: 0, result: 0, opponent: null });
  });

  it('picks the first opponent from the middle third of the ranking', () => {
    expect(startPlacement(129, always(0)).opponent).toBe(43);
    expect(startPlacement(129, always(0.999)).opponent).toBe(85);
  });

  it('varies the opponent between searches', () => {
    const random = seeded(1);
    const opponents = new Set(
      Array.from({ length: 50 }, () => startPlacement(129, random).opponent),
    );

    expect(opponents.size).toBeGreaterThan(20);
  });

  it('moves the search up when the fragrance is better and down when it is worse', () => {
    const start = startPlacement(10, always(0.5));
    expect(start.opponent).toBe(5);

    expect(answerPlacement(start, 'better', always(0.5))).toMatchObject({ low: 0, high: 5 });
    expect(answerPlacement(start, 'worse', always(0.5))).toMatchObject({ low: 6, high: 10 });
  });

  it('places an equal fragrance right below its opponent', () => {
    const start = startPlacement(10, always(0.5));

    expect(answerPlacement(start, 'same')).toEqual({ low: 6, high: 6, result: 6, opponent: null });
  });

  it('ignores answers once settled', () => {
    const settled: PlacementSearch = { low: 3, high: 3, result: 3, opponent: null };

    expect(answerPlacement(settled, 'better')).toBe(settled);
  });

  it('finds every position, rarely needing more than the typical number of questions', () => {
    const random = seeded(2);
    let searches = 0;
    let longer = 0;
    for (let count = 0; count <= 140; count++) {
      for (let target = 0; target <= count; target++) {
        const { result, questions } = placeAt(count, target, random);
        expect(result).toBe(target);
        // Each answer rules out at least a third of the range.
        expect(questions).toBeLessThanOrEqual(Math.ceil(Math.log(count + 1) / Math.log(1.5)));
        searches++;
        if (questions > typicalPlacementQuestions(count)) { longer++; }
      }
    }

    expect(longer / searches).toBeLessThan(0.2);
  });

  it('typically needs 8 answers for a collection of about 130', () => {
    expect(typicalPlacementQuestions(129)).toBe(8);
    expect(typicalPlacementQuestions(1)).toBe(1);
    expect(typicalPlacementQuestions(0)).toBe(0);
  });
});
