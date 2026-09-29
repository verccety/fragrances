import { FragranceData, createFragrance } from './fragrance.model';
import { backupFileName, createBackup, readBackup } from './fragrance.backup';
import { INITIAL_FRAGRANCES } from './fragrance.data';

const ITEMS: FragranceData[] = [
  { name: 'Creed Aventus', status: 'enjoy', grandmaStatus: 'liked' },
  { name: 'Xerjoff Naxos', status: null, grandmaStatus: 'unknown' },
];

describe('createBackup', () => {
  it('writes the list with app, version and export time', () => {
    const now = new Date('2026-09-30T12:34:56.000Z');

    expect(JSON.parse(createBackup(ITEMS, now))).toEqual({
      app: 'fragrance-collection',
      version: 1,
      exportedAt: '2026-09-30T12:34:56.000Z',
      items: ITEMS,
    });
  });

  it('leaves out ids', () => {
    const backup = JSON.parse(createBackup([createFragrance(ITEMS[0], 'some-id')]));

    expect(backup.items).toEqual([ITEMS[0]]);
  });
});

describe('backupFileName', () => {
  it('uses the local date', () => {
    expect(backupFileName(new Date(2026, 0, 5, 23, 59))).toBe('fragrances-2026-01-05.json');
  });
});

describe('readBackup', () => {
  it('round-trips the default collection', () => {
    expect(readBackup(createBackup(INITIAL_FRAGRANCES))).toEqual({
      ok: true,
      items: INITIAL_FRAGRANCES,
    });
  });

  it('accepts a bare array such as a copy of the saved localStorage value', () => {
    const saved = JSON.stringify([createFragrance(ITEMS[0], 'id-1')]);

    expect(readBackup(saved)).toEqual({ ok: true, items: [ITEMS[0]] });
  });

  it('repairs invalid statuses and drops entries without a name', () => {
    const text = JSON.stringify({
      version: 1,
      items: [
        { name: '  Creed Aventus ', status: 'love', grandmaStatus: 'maybe' },
        { name: '' },
        null,
        'Xerjoff Naxos',
      ],
    });

    expect(readBackup(text)).toEqual({
      ok: true,
      items: [{ name: 'Creed Aventus', status: null, grandmaStatus: 'unknown' }],
    });
  });

  it.each([
    ['invalid JSON', '{oops', 'This file is not valid JSON.'],
    ['an object without items', '{"name":"Creed Aventus"}', 'This file is not a fragrance backup.'],
    ['a plain value', '42', 'This file is not a fragrance backup.'],
    ['an empty list', '{"version":1,"items":[]}', 'No fragrances found in this file.'],
    ['only unreadable entries', '[{"name":""},null]', 'No fragrances found in this file.'],
    [
      'a newer format version',
      JSON.stringify({ version: 2, items: ITEMS }),
      'This backup was made by a newer version of the app.',
    ],
  ])('rejects %s', (_, text, error) => {
    expect(readBackup(text)).toEqual({ ok: false, error });
  });
});
