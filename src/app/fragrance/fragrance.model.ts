export interface StatusOption<T> {
  value: T;
  icon: string;
  label: string;
  /** What the icon means in the exported list legend. */
  legend: string;
}

/** Personal ratings, in the order a click cycles through them. */
export const PERSONAL_STATUSES = [
  { value: null, icon: '○', label: 'Not rated', legend: 'Personal status not set' },
  { value: 'enjoy', icon: '✅', label: 'Enjoy', legend: 'Personally enjoyed' },
  { value: 'dislike', icon: '🚩', label: 'Dislike', legend: 'Personally disliked' },
] as const satisfies readonly StatusOption<string | null>[];

/** Grandma's verdicts, in the order a click cycles through them. */
export const GRANDMA_STATUSES = [
  { value: 'unknown', icon: '❔', label: 'Unknown', legend: "Grandma's position is unknown" },
  { value: 'disliked', icon: '👎', label: 'Disliked', legend: 'Grandma disliked it' },
  { value: 'liked', icon: '👍', label: 'Liked', legend: 'Grandma liked and approved it' },
  { value: 'indifferent', icon: '➖', label: 'Indifferent', legend: 'Grandma was indifferent' },
] as const satisfies readonly StatusOption<string>[];

export type FragranceStatus = (typeof PERSONAL_STATUSES)[number]['value'];
export type GrandmaStatus = (typeof GRANDMA_STATUSES)[number]['value'];

/** A fragrance as written in the export format or the defaults, without identity. */
export interface FragranceData {
  name: string;
  status: FragranceStatus;
  grandmaStatus: GrandmaStatus;
}

export interface Fragrance extends FragranceData {
  id: string;
}

export function createFragrance(data: FragranceData, id: string = crypto.randomUUID()): Fragrance {
  return { id, name: data.name, status: data.status, grandmaStatus: data.grandmaStatus };
}

export function personalStatus(status: FragranceStatus): StatusOption<FragranceStatus> {
  return optionFor(PERSONAL_STATUSES, status);
}

export function grandmaStatus(status: GrandmaStatus): StatusOption<GrandmaStatus> {
  return optionFor(GRANDMA_STATUSES, status);
}

export function nextStatus(current: FragranceStatus): FragranceStatus {
  return nextIn(PERSONAL_STATUSES, current);
}

export function nextGrandmaStatus(current: GrandmaStatus): GrandmaStatus {
  return nextIn(GRANDMA_STATUSES, current);
}

/** Reads one fragrance from untrusted data, repairing statuses; `null` when it has no name. */
export function toFragranceData(value: unknown): FragranceData | null {
  if (value === null || typeof value !== 'object') { return null; }

  const item = value as Record<string, unknown>;
  const name = String(item['name'] ?? '').trim();
  if (!name) { return null; }

  return {
    name,
    status: toFragranceStatus(item['status']),
    grandmaStatus: toGrandmaStatus(item['grandmaStatus']),
  };
}

/** Reads a status from untrusted data, falling back to "not set". */
export function toFragranceStatus(value: unknown): FragranceStatus {
  return valueOrDefault(PERSONAL_STATUSES, value);
}

/** Reads a grandma status from untrusted data, falling back to "unknown". */
export function toGrandmaStatus(value: unknown): GrandmaStatus {
  return valueOrDefault(GRANDMA_STATUSES, value);
}

function optionFor<T>(options: readonly StatusOption<T>[], value: T): StatusOption<T> {
  return options.find((option) => option.value === value) ?? options[0];
}

function nextIn<T>(options: readonly StatusOption<T>[], value: T): T {
  const index = options.findIndex((option) => option.value === value);
  return options[(index + 1) % options.length].value;
}

function valueOrDefault<T>(options: readonly StatusOption<T>[], value: unknown): T {
  return options.find((option) => option.value === value)?.value ?? options[0].value;
}
