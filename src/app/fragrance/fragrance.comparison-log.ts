import { Injectable, inject, signal } from '@angular/core';
import { FragranceStore } from './fragrance.store';
import { ComparisonTimes } from './fragrance.refine';

const STORAGE_KEY = 'fragrance-app.compared.v1';

/**
 * When each fragrance was last compared in "Refine ranking", so sessions start from the ones
 * not checked for the longest time. Kept apart from the fragrances: exports and backups
 * don't include it, and losing it only makes the next session less targeted.
 */
@Injectable({ providedIn: 'root' })
export class ComparisonLog {
  private readonly store = inject(FragranceStore);
  private readonly state = signal<ComparisonTimes>(loadTimes());

  public readonly lastCompared = this.state.asReadonly();

  public record(ids: readonly string[], now: number = Date.now()): void {
    // Drop entries of fragrances that no longer exist.
    const known = new Set(this.store.items().map((item) => item.id));
    const times: Record<string, number> = Object.fromEntries(
      Object.entries(this.state()).filter(([id]) => known.has(id)),
    );
    for (const id of ids) {
      if (known.has(id)) { times[id] = now; }
    }

    this.state.set(times);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(times));
    } catch {
      // Ignore quota/security errors; the log is only a hint.
    }
  }
}

function loadTimes(): ComparisonTimes {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) { return {}; }
    return Object.fromEntries(
      Object.entries(parsed).filter(([, time]) => typeof time === 'number' && Number.isFinite(time)),
    );
  } catch {
    return {};
  }
}
