import { Fragrance, formatList, parseList } from './fragrance.model';
import { INITIAL_FRAGRANCES } from './fragrance.data';

const LEGEND = [
  'Legend:',
  '○ = Personal status not set',
  '✅ = Personally enjoyed',
  '🚩 = Personally disliked',
  "❔ = Grandma's position is unknown",
  '👎 = Grandma disliked it',
  '👍 = Grandma liked and approved it',
  '➖ = Grandma was indifferent',
].join('\n');

describe('formatList', () => {
  it('numbers every fragrance and appends the legend', () => {
    const items: Fragrance[] = [
      { name: 'Creed Aventus', status: 'enjoy', grandmaStatus: 'liked' },
      { name: 'Tom Ford Noir Extreme', status: 'dislike', grandmaStatus: 'disliked' },
      { name: 'Xerjoff Naxos', status: null, grandmaStatus: 'indifferent' },
      { name: 'Memo African Leather', status: null, grandmaStatus: 'unknown' },
    ];

    expect(formatList(items)).toBe(
      [
        '1) Creed Aventus (✅) [Grandma: 👍]',
        '2) Tom Ford Noir Extreme (🚩) [Grandma: 👎]',
        '3) Xerjoff Naxos (○) [Grandma: ➖]',
        '4) Memo African Leather (○) [Grandma: ❔]',
        '',
        LEGEND,
      ].join('\n'),
    );
  });

  it('prints only the legend for an empty list', () => {
    expect(formatList([])).toBe(`\n\n${LEGEND}`);
  });
});

describe('parseList', () => {
  it('reads personal and grandma statuses', () => {
    const text = [
      '1) Creed Aventus (✅) [Grandma: 👍]',
      '2) Tom Ford Noir Extreme (🚩) [Grandma: 👎]',
      '3) Xerjoff Naxos (○) [Grandma: ➖]',
      '4) Memo African Leather (○) [Grandma: ❔]',
    ].join('\n');

    expect(parseList(text)).toEqual([
      { name: 'Creed Aventus', status: 'enjoy', grandmaStatus: 'liked' },
      { name: 'Tom Ford Noir Extreme', status: 'dislike', grandmaStatus: 'disliked' },
      { name: 'Xerjoff Naxos', status: null, grandmaStatus: 'indifferent' },
      { name: 'Memo African Leather', status: null, grandmaStatus: 'unknown' },
    ]);
  });

  it('accepts older exports without a status or grandma marker', () => {
    const text = [
      '1) Creed Aventus (✅)',
      '2) Xerjoff Naxos',
      '3) Kilian Smoking Hot [Grandma: 👍]',
    ].join('\n');

    expect(parseList(text)).toEqual([
      { name: 'Creed Aventus', status: 'enjoy', grandmaStatus: 'unknown' },
      { name: 'Xerjoff Naxos', status: null, grandmaStatus: 'unknown' },
      { name: 'Kilian Smoking Hot', status: null, grandmaStatus: 'liked' },
    ]);
  });

  it('skips the legend, blank lines and anything not numbered', () => {
    const text = formatList([
      { name: 'Creed Aventus', status: 'enjoy', grandmaStatus: 'liked' },
    ]).concat('\n\nsome note\n- 2) not a list item');

    expect(parseList(text)).toEqual([
      { name: 'Creed Aventus', status: 'enjoy', grandmaStatus: 'liked' },
    ]);
  });

  it('handles Windows line endings and surrounding whitespace', () => {
    const text =
      '  1) Creed Aventus (✅) [Grandma: 👍]  \r\n\r\n2) Xerjoff Naxos (○) [Grandma: ❔]\r\n';

    expect(parseList(text)).toEqual([
      { name: 'Creed Aventus', status: 'enjoy', grandmaStatus: 'liked' },
      { name: 'Xerjoff Naxos', status: null, grandmaStatus: 'unknown' },
    ]);
  });

  it('keeps parentheses that are part of the name', () => {
    expect(parseList('1) Chanel Bleu de Chanel Parfum (2018) (✅) [Grandma: ❔]')).toEqual([
      { name: 'Chanel Bleu de Chanel Parfum (2018)', status: 'enjoy', grandmaStatus: 'unknown' },
    ]);
  });

  it('ignores the numbers in the text and keeps line order', () => {
    expect(parseList('5) B\n1) A').map((f) => f.name)).toEqual(['B', 'A']);
  });

  it('returns an empty list for text without list items', () => {
    expect(parseList('')).toEqual([]);
    expect(parseList('hello\nworld')).toEqual([]);
  });

  it('round-trips the default collection through formatList', () => {
    expect(parseList(formatList(INITIAL_FRAGRANCES))).toEqual(INITIAL_FRAGRANCES);
  });
});
