import { tierChange, tierForRank, tierStartingAt } from './fragrance.tiers';

describe('tiers', () => {
  it.each([
    [1, 'top10'],
    [10, 'top10'],
    [11, 'top25'],
    [25, 'top25'],
    [26, 'top50'],
    [50, 'top50'],
    [51, 'rest'],
    [500, 'rest'],
  ])('puts rank %i in %s', (rank, id) => {
    expect(tierForRank(rank).id).toBe(id);
  });

  it('starts a tier only at its first rank', () => {
    const starts = Array.from({ length: 60 }, (_, i) => i + 1).filter(
      (rank) => tierStartingAt(rank) !== null,
    );

    expect(starts).toEqual([1, 11, 26, 51]);
    expect(tierStartingAt(26)?.label).toBe('Top 50');
  });

  it('describes a move across tiers and ignores moves within one', () => {
    expect(tierChange(12, 3)).toBe('Top 25 → Top 10');
    expect(tierChange(87, 41)).toBe('The rest → Top 50');
    expect(tierChange(5, 30)).toBe('Top 10 → Top 50');
    expect(tierChange(12, 20)).toBeNull();
  });
});
