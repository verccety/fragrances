import { FragranceData } from './fragrance.model';
import {
  EMPTY_FILTER,
  FragranceFilter,
  isFilterActive,
  matchesFilter,
  toggleValue,
} from './fragrance.filter';

const ITEMS: FragranceData[] = [
  { name: 'Creed Aventus', status: 'enjoy', grandmaStatus: 'liked' },
  { name: 'Xerjoff Naxos', status: null, grandmaStatus: 'liked' },
  { name: 'Tom Ford Noir Extreme', status: 'dislike', grandmaStatus: 'disliked' },
  { name: 'Kilian Smoking Hot', status: 'enjoy', grandmaStatus: 'unknown' },
];

const names = (filter: Partial<FragranceFilter>) =>
  ITEMS.filter((item) => matchesFilter(item, { ...EMPTY_FILTER, ...filter })).map((i) => i.name);

describe('fragrance filter', () => {
  it('matches everything when empty', () => {
    expect(names({})).toEqual(ITEMS.map((i) => i.name));
    expect(isFilterActive(EMPTY_FILTER)).toBe(false);
  });

  it('matches any selected value within a group', () => {
    expect(names({ statuses: ['enjoy', null] })).toEqual([
      'Creed Aventus',
      'Xerjoff Naxos',
      'Kilian Smoking Hot',
    ]);
    expect(names({ grandmaStatuses: ['disliked', 'unknown'] })).toEqual([
      'Tom Ford Noir Extreme',
      'Kilian Smoking Hot',
    ]);
  });

  it('requires every group and the name search to match', () => {
    expect(names({ statuses: ['enjoy'], grandmaStatuses: ['liked'] })).toEqual(['Creed Aventus']);
    expect(names({ name: ' KILIAN ', statuses: ['enjoy'] })).toEqual(['Kilian Smoking Hot']);
    expect(names({ name: 'naxos', statuses: ['enjoy'] })).toEqual([]);
  });

  it('is active when any part is set, ignoring a blank search', () => {
    expect(isFilterActive({ ...EMPTY_FILTER, name: '   ' })).toBe(false);
    expect(isFilterActive({ ...EMPTY_FILTER, name: 'a' })).toBe(true);
    expect(isFilterActive({ ...EMPTY_FILTER, statuses: [null] })).toBe(true);
    expect(isFilterActive({ ...EMPTY_FILTER, grandmaStatuses: ['liked'] })).toBe(true);
  });

  it('toggles values in and out', () => {
    expect(toggleValue(['enjoy'], null)).toEqual(['enjoy', null]);
    expect(toggleValue(['enjoy', null], 'enjoy')).toEqual([null]);
  });
});
