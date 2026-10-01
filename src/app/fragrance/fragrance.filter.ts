import { FragranceData, FragranceStatus, GrandmaStatus } from './fragrance.model';

/**
 * Status filters for the list. Within a group any selected value matches ("or");
 * groups and the name search must all match ("and"). An empty group matches everything.
 */
export interface FragranceFilter {
  name: string;
  statuses: readonly FragranceStatus[];
  grandmaStatuses: readonly GrandmaStatus[];
}

export const EMPTY_FILTER: FragranceFilter = { name: '', statuses: [], grandmaStatuses: [] };

export function matchesFilter(item: FragranceData, filter: FragranceFilter): boolean {
  const name = filter.name.trim().toLowerCase();
  return (
    (!name || item.name.toLowerCase().includes(name)) &&
    (filter.statuses.length === 0 || filter.statuses.includes(item.status)) &&
    (filter.grandmaStatuses.length === 0 || filter.grandmaStatuses.includes(item.grandmaStatus))
  );
}

export function isFilterActive(filter: FragranceFilter): boolean {
  return (
    filter.name.trim() !== '' || filter.statuses.length > 0 || filter.grandmaStatuses.length > 0
  );
}

/** Adds the value when absent, removes it when present. */
export function toggleValue<T>(values: readonly T[], value: T): T[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}
