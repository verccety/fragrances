import {
  FAR_DISTANCE,
  NEAR_DISTANCE,
  Random,
  RefineAnswer,
  RefineSession,
  answerRefine,
  refineMoves,
  startRefine,
} from './fragrance.refine';

const ids = (count: number) => Array.from({ length: count }, (_, i) => `f${i + 1}`);
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

function asking(session: RefineSession, upper: string, lower: string): RefineSession {
  return { ...session, current: { upper, lower, upperOnLeft: true } };
}

describe('refine ranking', () => {
  describe('picking pairs', () => {
    it('starts from the least recently compared fragrance', () => {
      const order = ids(10);
      const lastCompared = Object.fromEntries(order.map((id) => [id, 100]));
      delete lastCompared['f4'];

      const session = startRefine(order, lastCompared, always(0));

      expect(session.current).toEqual({ upper: 'f4', lower: 'f10', upperOnLeft: true });
    });

    it('mostly compares neighbours and never fragrances too far apart', () => {
      const order = ids(100);
      const random = seeded(1);
      let near = 0;
      let total = 0;
      for (let run = 0; run < 200; run++) {
        const pair = startRefine(order, {}, random).current!;
        const distance = order.indexOf(pair.lower) - order.indexOf(pair.upper);
        expect(distance).toBeGreaterThan(0);
        expect(distance).toBeLessThanOrEqual(FAR_DISTANCE);
        if (distance <= NEAR_DISTANCE) { near++; }
        total++;
      }

      expect(near / total).toBeGreaterThan(0.6);
    });

    it('never asks the same pair twice and ends when every pair was asked', () => {
      const random = seeded(2);
      let session = startRefine(ids(3), {}, random);
      const asked: string[] = [];

      while (session.current) {
        asked.push([session.current.upper, session.current.lower].sort().join('|'));
        session = answerRefine(session, 'upper', {}, random);
      }

      expect(asked).toHaveLength(3);
      expect(new Set(asked).size).toBe(3);
    });

    it('has nothing to ask with fewer than two fragrances', () => {
      expect(startRefine(['f1'], {}).current).toBeNull();
      expect(startRefine([], {}).current).toBeNull();
    });
  });

  describe('answers', () => {
    const order = ids(20);
    const start = () => startRefine(order, {}, always(0.5));

    it.each<RefineAnswer>(['upper', 'same'])('keeps the order for "%s"', (answer) => {
      const session = answerRefine(asking(start(), 'f2', 'f4'), answer, {}, always(0.5));

      expect(session.draft).toEqual(order);
      expect(session.answered).toBe(1);
      expect(session.compared).toEqual(['f2', 'f4']);
      expect(refineMoves(session)).toEqual([]);
    });

    it('does not count a skipped pair as compared', () => {
      const session = answerRefine(asking(start(), 'f2', 'f4'), 'skip', {}, always(0.5));

      expect(session.answered).toBe(0);
      expect(session.compared).toEqual([]);
      expect(session.asked).toHaveLength(1);
    });

    it('moves the winner of a near upset right above the loser', () => {
      const session = answerRefine(asking(start(), 'f2', 'f4'), 'lower', {}, always(0.5));

      expect(session.draft.slice(0, 5)).toEqual(['f1', 'f4', 'f2', 'f3', 'f5']);
      expect(refineMoves(session)).toEqual([{ id: 'f4', from: 4, to: 2 }]);
    });

    it('asks again before moving the winner of a far upset', () => {
      const upset = answerRefine(asking(start(), 'f3', 'f16'), 'lower', {}, always(0.5));

      expect(upset.draft).toEqual(order);
      expect(upset.current?.lower).toBe('f16');
      expect(['f1', 'f2', 'f4', 'f5']).toContain(upset.current?.upper);
    });

    it('moves the far upset winner above both fragrances once it wins again', () => {
      const upset = answerRefine(asking(start(), 'f3', 'f16'), 'lower', {}, always(0.5));
      const second = upset.current!.upper;

      const session = answerRefine(upset, 'lower', {}, always(0.5));

      const top = order.indexOf(second) < order.indexOf('f3') ? second : 'f3';
      expect(session.draft.indexOf('f16')).toBe(order.indexOf(top));
      expect(session.draft.indexOf('f16')).toBeLessThan(session.draft.indexOf('f3'));
      expect(session.draft.indexOf('f16')).toBeLessThan(session.draft.indexOf(second));
      expect(refineMoves(session)).toEqual([{ id: 'f16', from: 16, to: order.indexOf(top) + 1 }]);
    });

    it.each<RefineAnswer>(['upper', 'same', 'skip'])(
      'treats a far upset as a fluke when the second answer is "%s"',
      (answer) => {
        const upset = answerRefine(asking(start(), 'f3', 'f16'), 'lower', {}, always(0.5));

        const session = answerRefine(upset, answer, {}, always(0.5));

        expect(session.draft).toEqual(order);
        expect(session.pending).toBeNull();
      },
    );
  });

  it('keeps every fragrance exactly once through a long random session', () => {
    const order = ids(50);
    const random = seeded(3);
    const answers: RefineAnswer[] = ['upper', 'lower', 'same', 'skip'];
    let session = startRefine(order, {}, random);

    for (let i = 0; i < 300 && session.current; i++) {
      session = answerRefine(session, answers[Math.floor(random() * 4)], {}, random);
    }

    expect([...session.draft].sort()).toEqual([...order].sort());
    expect(session.promoted.every((id) => order.includes(id))).toBe(true);
  });
});
