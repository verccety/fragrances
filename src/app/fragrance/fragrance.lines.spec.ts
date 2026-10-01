import { Fragrance, createFragrance } from './fragrance.model';
import { baseName, listLines, matchingLines, suggestLines } from './fragrance.lines';

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

  describe('base names', () => {
    it.each([
      ['Chanel Bleu de Chanel EDP', 'Chanel Bleu de Chanel'],
      ['Chanel Bleu de Chanel Parfum (2018)', 'Chanel Bleu de Chanel'],
      ['Christian Dior Homme 2020', 'Christian Dior Homme'],
      ['Ex Nihilo The Hedonist Extrait de Parfum', 'Ex Nihilo The Hedonist'],
      ['Xerjoff Torino 21', 'Xerjoff Torino 21'],
      ['Creed Aventus Absolu', 'Creed Aventus Absolu'],
    ])('%s → %s', (name, base) => {
      expect(baseName(name)).toBe(base);
    });
  });

  describe('suggestions', () => {
    const suggest = (...items: Fragrance[]) =>
      suggestLines(items).map((s) => [s.name, s.members.map((m) => m.name)]);

    it('groups flankers whose base name starts with another one', () => {
      expect(
        suggest(
          make('Creed Aventus Absolu'),
          make('Xerjoff Naxos'),
          make('Creed Aventus'),
          make('Creed Aventus Cologne'),
        ),
      ).toEqual([
        ['Creed Aventus', ['Creed Aventus Absolu', 'Creed Aventus', 'Creed Aventus Cologne']],
      ]);
    });

    it('groups concentrations of the same scent', () => {
      expect(
        suggest(make('Chanel Bleu de Chanel EDP'), make('Chanel Bleu de Chanel Parfum (2018)')),
      ).toEqual([
        [
          'Chanel Bleu de Chanel',
          ['Chanel Bleu de Chanel EDP', 'Chanel Bleu de Chanel Parfum (2018)'],
        ],
      ]);
    });

    it('does not group different scents of one brand', () => {
      expect(
        suggest(
          make('Creed Aventus'),
          make('Creed Royal Oud'),
          make('Parfums de Marly Layton'),
          make('Parfums de Marly Herod'),
        ),
      ).toEqual([]);
    });

    it('uses the existing line name and skips groups that are already set up', () => {
      expect(suggest(make('Creed Aventus', 'Aventus line'), make('Creed Aventus Absolu'))).toEqual([
        ['Aventus line', ['Creed Aventus', 'Creed Aventus Absolu']],
      ]);
      expect(
        suggest(
          make('Creed Aventus', 'Aventus line'),
          make('Creed Aventus Absolu', 'aventus LINE'),
        ),
      ).toEqual([]);
    });

    it('never merges two existing lines', () => {
      expect(suggest(make('Creed Aventus', 'One'), make('Creed Aventus Absolu', 'Two'))).toEqual(
        [],
      );
    });
  });
});
