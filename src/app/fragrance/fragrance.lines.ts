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
