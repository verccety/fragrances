import {
  Fragrance,
  GRANDMA_STATUSES,
  PERSONAL_STATUSES,
  StatusOption,
  grandmaStatus,
  personalStatus,
} from './fragrance.model';

// Plain-text list format used for export and import, e.g. `1) Creed Aventus (✅) [Grandma: 👍]`.

const LINE_PATTERN = new RegExp(
  `^\\d+\\)\\s+(.+?)` +
    `(?:\\s+\\((${iconAlternatives(PERSONAL_STATUSES)})\\))?` +
    `(?:\\s+\\[Grandma:\\s*(${iconAlternatives(GRANDMA_STATUSES)})\\])?$`,
  'u',
);

export function formatList(items: readonly Fragrance[]): string {
  const lines = items.map(
    (item, i) =>
      `${i + 1}) ${item.name} (${personalStatus(item.status).icon}) ` +
      `[Grandma: ${grandmaStatus(item.grandmaStatus).icon}]`,
  );
  const legend = [...PERSONAL_STATUSES, ...GRANDMA_STATUSES].map(
    (option) => `${option.icon} = ${option.legend}`,
  );

  return `${lines.join('\n')}\n\nLegend:\n${legend.join('\n')}`;
}

/** Reads fragrances from an exported list, skipping lines that are not list items. */
export function parseList(text: string): Fragrance[] {
  const result: Fragrance[] = [];

  for (const line of text.split('\n')) {
    const match = line.trim().match(LINE_PATTERN);
    if (match) {
      result.push({
        name: match[1].trim(),
        status: valueByIcon(PERSONAL_STATUSES, match[2]),
        grandmaStatus: valueByIcon(GRANDMA_STATUSES, match[3]),
      });
    }
  }

  return result;
}

function iconAlternatives(options: readonly StatusOption<unknown>[]): string {
  return options.map((option) => option.icon).join('|');
}

/** A missing icon means the first (default) option. */
function valueByIcon<T>(options: readonly StatusOption<T>[], icon: string | undefined): T {
  return options.find((option) => option.icon === icon)?.value ?? options[0].value;
}
