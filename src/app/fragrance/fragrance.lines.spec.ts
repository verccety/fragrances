import { Fragrance, createFragrance } from './fragrance.model';
import { listLines, matchingLines } from './fragrance.lines';

const make = (name: string, line?: string): Fragrance =>
  createFragrance({ name, status: null, grandmaStatus: 'unknown', line }, name);

const RANKING = [
  make('Creed Aventus Absolu', 'Creed Aventus'),
  make('Xerjoff Naxos'),
  make('Creed Aventus', 'creed aventus'),
  make('Chanel Bleu de Chanel EDP', 'Bleu de Chanel'),
  make('Chanel Bleu de Chanel Parfum', 'Bleu de Chanel'),
];

describe('fragrance lines', () => {
  it('groups members case-insensitively, ordered by the best-ranked member', () => {
    const lines = listLines(RANKING);

    expect(lines.map((line) => line.name)).toEqual(['Creed Aventus', 'Bleu de Chanel']);
    expect(lines[0].members.map((f) => f.name)).toEqual(['Creed Aventus Absolu', 'Creed Aventus']);
    expect(lines[1].members).toHaveLength(2);
  });

  it('ignores fragrances outside any line', () => {
    expect(listLines([make('Xerjoff Naxos')])).toEqual([]);
  });

  it('offers lines contained in the text first, then lines containing it', () => {
    const lines = listLines([
      make('A', 'Creed Aventus'),
      make('B', 'Creed Aventus Absolu Line'),
      make('C', 'Bleu de Chanel'),
    ]);

    expect(matchingLines(lines, 'Creed Aventus Absolu').map((l) => l.name)).toEqual([
      'Creed Aventus',
      'Creed Aventus Absolu Line',
    ]);
    expect(matchingLines(lines, 'Chanel Bleu de Chanel EDP').map((l) => l.name)).toEqual([
      'Bleu de Chanel',
    ]);
    expect(matchingLines(lines, 'Xerjoff Naxos')).toEqual([]);
    expect(matchingLines(lines, 'aventus').map((l) => l.name)).toEqual([
      'Creed Aventus',
      'Creed Aventus Absolu Line',
    ]);
    expect(matchingLines(lines, '  ').map((l) => l.name)).toHaveLength(3);
  });
});
