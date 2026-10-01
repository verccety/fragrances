import { Fragrance } from './fragrance.model';

// Lines group an original fragrance with its flankers. A line is identified by its name,
// compared case-insensitively, so "Creed Aventus" and "creed aventus" are the same line.

export interface LineSummary {
  key: string;
  /** Display name, as written on the line's highest-ranked member. */
  name: string;
  /** Members in ranking order. */
  members: Fragrance[];
}

export function lineKey(line: string): string {
  return line.trim().toLowerCase();
}

/** All lines in the ranking, ordered by their best-ranked member. */
export function listLines(ranking: readonly Fragrance[]): LineSummary[] {
  const lines = new Map<string, LineSummary>();
  for (const item of ranking) {
    if (!item.line) { continue; }
    const key = lineKey(item.line);
    const line = lines.get(key);
    if (line) {
      line.members.push(item);
    } else {
      lines.set(key, { key, name: item.line, members: [item] });
    }
  }
  return [...lines.values()];
}

export interface LineSuggestion {
  /** Name for the line: an existing line's name, or the shortest shared base name. */
  name: string;
  /** Members in ranking order. */
  members: Fragrance[];
}

// Trailing parts that name a concentration or release year rather than a different scent.
const CONCENTRATIONS = [
  'eau de parfum',
  'eau de toilette',
  'eau de cologne',
  'extrait de parfum',
  'extrait',
  'parfum',
  'edp',
  'edt',
  'edc',
];
const CONCENTRATION_SUFFIX = new RegExp(
  `\\s+(?:${CONCENTRATIONS.join('|')}|\\(?(?:19|20)\\d{2}\\)?)$`,
  'i',
);

/**
 * The name without trailing concentration and year,
 * e.g. "Bleu de Chanel Parfum (2018)" → "Bleu de Chanel".
 */
export function baseName(name: string): string {
  let base = name.trim();
  while (CONCENTRATION_SUFFIX.test(base)) {
    base = base.replace(CONCENTRATION_SUFFIX, '');
  }
  return base;
}

/**
 * Groups of fragrances that look like one line: one base name starts another
 * ("Creed Aventus" → "Creed Aventus Absolu"), or base names are equal ("… EDP" / "… Parfum").
 * Only groups where something would change are suggested, and never groups that would
 * merge two existing lines.
 */
export function suggestLines(ranking: readonly Fragrance[]): LineSuggestion[] {
  const words = ranking.map((item) => lineKey(baseName(item.name)).split(/\s+/));
  const parent = ranking.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));

  for (let a = 0; a < ranking.length; a++) {
    for (let b = a + 1; b < ranking.length; b++) {
      if (isWordPrefix(words[a], words[b]) || isWordPrefix(words[b], words[a])) {
        parent[find(a)] = find(b);
      }
    }
  }

  const groups = new Map<number, number[]>();
  for (let i = 0; i < ranking.length; i++) {
    const root = find(i);
    groups.set(root, [...(groups.get(root) ?? []), i]);
  }

  const suggestions: LineSuggestion[] = [];
  for (const indexes of groups.values()) {
    if (indexes.length < 2) { continue; }
    const members = indexes.map((i) => ranking[i]);
    const existing = new Set(members.flatMap((item) => (item.line ? [lineKey(item.line)] : [])));
    if (existing.size > 1) { continue; }

    const lined = members.find((item) => item.line);
    const shortest = indexes.reduce((best, i) => (words[i].length < words[best].length ? i : best));
    const name = lined?.line ?? baseName(ranking[shortest].name);
    if (members.every((item) => item.line && lineKey(item.line) === lineKey(name))) { continue; }

    suggestions.push({ name, members });
  }
  return suggestions;
}

/** Whether `prefix` is the start of `words`; needs two words, so a lone brand never matches. */
function isWordPrefix(prefix: readonly string[], words: readonly string[]): boolean {
  return (
    prefix.length >= 2 && prefix.length <= words.length && prefix.every((w, i) => w === words[i])
  );
}

/**
 * Lines worth offering for a search text: names containing the text, or contained in it
 * (so "Creed Aventus Absolu" finds the "Creed Aventus" line). Contained ones come first.
 */
export function matchingLines(lines: readonly LineSummary[], text: string): LineSummary[] {
  const query = lineKey(text);
  if (!query) { return [...lines]; }
  const contained = lines.filter((line) => query.includes(line.key));
  const containing = lines.filter((line) => !query.includes(line.key) && line.key.includes(query));
  return [...contained, ...containing];
}
