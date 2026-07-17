export type FragranceStatus = 'enjoy' | 'dislike' | null;
export type GrandmaStatus = 'unknown' | 'disliked' | 'liked' | 'indifferent';

export interface Fragrance {
  name: string;
  status: FragranceStatus;
  grandmaStatus: GrandmaStatus;
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

export function nextGrandmaStatus(current: GrandmaStatus): GrandmaStatus {
  if (current === 'unknown') {return 'disliked';}
  if (current === 'disliked') {return 'liked';}
  if (current === 'liked') {return 'indifferent';}
  return 'unknown';
}

export function grandmaStatusIcon(status: GrandmaStatus): string {
  if (status === 'disliked') {return '👎';}
  if (status === 'liked') {return '👍';}
  if (status === 'indifferent') {return '➖';}
  return '❔';
}

export function grandmaStatusLabel(status: GrandmaStatus): string {
  if (status === 'disliked') {return 'Disliked';}
  if (status === 'liked') {return 'Liked';}
  if (status === 'indifferent') {return 'Indifferent';}
  return 'Unknown';
}

export function formatList(items: Fragrance[]): string {
  const fragrances = items
    .map((it, i) => {
      const icon = statusIcon(it.status);
      const grandmaIcon = grandmaStatusIcon(it.grandmaStatus);
      return `${i + 1}) ${it.name}${icon ? ` (${icon})` : ''} [Grandma: ${grandmaIcon}]`;
    })
    .join('\n');

  return `${fragrances}\n\nLegend:\n○ = Personal status not set\n✅ = Personally enjoyed\n🚩 = Personally disliked\n❔ = Grandma's position is unknown\n👎 = Grandma disliked it\n👍 = Grandma liked and approved it\n➖ = Grandma was indifferent`;
}

export function parseList(text: string): Fragrance[] {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const result: Fragrance[] = [];

  for (const line of lines) {
    const match = line.match(
      /^\d+\)\s+(.+?)(?:\s+\((✅|🚩)\))?(?:\s+\[Grandma:\s*(❔|👎|👍|➖)\])?$/,
    );
    if (match) {
      const name = match[1].trim();
      let status: FragranceStatus = null;
      let grandmaStatus: GrandmaStatus = 'unknown';
      if (match[2] === '✅') {status = 'enjoy';}
      else if (match[2] === '🚩') {status = 'dislike';}
      if (match[3] === '👎') {grandmaStatus = 'disliked';}
      else if (match[3] === '👍') {grandmaStatus = 'liked';}
      else if (match[3] === '➖') {grandmaStatus = 'indifferent';}
      result.push({ name, status, grandmaStatus });
    }
  }

  return result;
}
