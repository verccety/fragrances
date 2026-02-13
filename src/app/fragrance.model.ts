export type FragranceStatus = 'enjoy' | 'dislike' | null;

export interface Fragrance {
  name: string;
  status: FragranceStatus;
}

export function nextStatus(current: FragranceStatus): FragranceStatus {
  if (current === null) {return 'enjoy';}
  if (current === 'enjoy') {return 'dislike';}
  return null;
}

export function statusIcon(status: FragranceStatus): string {
  if (status === 'enjoy') {return '✅';}
  if (status === 'dislike') {return '🚩';}
  return '';
}

export function formatList(items: Fragrance[]): string {
  return items
    .map((it, i) => {
      const icon = statusIcon(it.status);
      return `${i + 1}) ${it.name}${icon ? ` (${icon})` : ''}`;
    })
    .join('\n');
}

export function parseList(text: string): Fragrance[] {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const result: Fragrance[] = [];

  for (const line of lines) {
    const match = line.match(/^\d+\)\s+(.+?)(?:\s+\((✅|🚩)\))?$/);
    if (match) {
      const name = match[1].trim();
      let status: FragranceStatus = null;
      if (match[2] === '✅') {status = 'enjoy';}
      else if (match[2] === '🚩') {status = 'dislike';}
      result.push({ name, status });
    }
  }

  return result;
}
