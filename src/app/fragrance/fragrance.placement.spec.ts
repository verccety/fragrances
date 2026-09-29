import {
  PlacementAnswer,
  PlacementSearch,
  answerPlacement,
  maxPlacementQuestions,
  opponentIndex,
  startPlacement,
} from './fragrance.placement';

/** Answers every question as if the fragrance truly belongs at `target`, returning the outcome. */
function placeAt(otherCount: number, target: number): { result: number | null; questions: number } {
  let search = startPlacement(otherCount);
  let questions = 0;
  while (search.result === null) {
    const answer: PlacementAnswer = target <= opponentIndex(search) ? 'better' : 'worse';
    search = answerPlacement(search, answer);
    questions++;
  }
  return { result: search.result, questions };
}

describe('fragrance placement', () => {
  it('is settled immediately when there is nothing to compare with', () => {
    expect(startPlacement(0)).toEqual({ low: 0, high: 0, result: 0 });
  });

  it('starts by comparing with the middle of the ranking', () => {
    expect(opponentIndex(startPlacement(129))).toBe(64);
  });

  it('moves the search up when the fragrance is better and down when it is worse', () => {
    const start = startPlacement(10);

    expect(answerPlacement(start, 'better')).toEqual({ low: 0, high: 5, result: null });
    expect(answerPlacement(start, 'worse')).toEqual({ low: 6, high: 10, result: null });
  });

  it('places an equal fragrance right below its opponent', () => {
    expect(answerPlacement(startPlacement(10), 'same')).toEqual({ low: 6, high: 6, result: 6 });
  });

  it('ignores answers once settled', () => {
    const settled: PlacementSearch = { low: 3, high: 3, result: 3 };

    expect(answerPlacement(settled, 'better')).toBe(settled);
  });

  it('finds every position within the question limit', () => {
    for (let count = 0; count <= 140; count++) {
      for (let target = 0; target <= count; target++) {
        const { result, questions } = placeAt(count, target);
        expect(result).toBe(target);
        expect(questions).toBeLessThanOrEqual(maxPlacementQuestions(count));
      }
    }
  });

  it('needs at most 8 answers for a collection of about 130', () => {
    expect(maxPlacementQuestions(129)).toBe(8);
    expect(maxPlacementQuestions(1)).toBe(1);
    expect(maxPlacementQuestions(0)).toBe(0);
  });
});
