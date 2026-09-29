import { Injectable, computed, effect, signal } from '@angular/core';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import {
  Fragrance,
  FragranceData,
  createFragrance,
  nextGrandmaStatus,
  nextStatus,
  toFragranceData,
} from './fragrance.model';
import { INITIAL_FRAGRANCES } from './fragrance.data';

const STORAGE_KEY = 'fragrance-app.items.v1';

/** The ranked fragrance list, persisted to localStorage on every change. */
@Injectable({ providedIn: 'root' })
export class FragranceStore {
  private readonly state = signal<Fragrance[]>(loadFragrances());

  public readonly items = this.state.asReadonly();

  public readonly stats = computed(() => {
    const all = this.state();
    return {
      total: all.length,
      enjoy: all.filter((f) => f.status === 'enjoy').length,
      dislike: all.filter((f) => f.status === 'dislike').length,
    };
  });

  constructor() {
    effect(() => saveFragrances(this.state()));
  }

  public add(name: string): void {
    const trimmed = name.trim();
    if (!trimmed) { return; }
    this.state.update((items) => [
      ...items,
      createFragrance({ name: trimmed, status: null, grandmaStatus: 'unknown' }),
    ]);
  }

  public rename(id: string, name: string): void {
    const trimmed = name.trim();
    if (!trimmed) { return; }
    this.update(id, (item) => ({ ...item, name: trimmed }));
  }

  public remove(id: string): void {
    this.state.update((items) => items.filter((item) => item.id !== id));
  }

  public toggleStatus(id: string): void {
    this.update(id, (item) => ({ ...item, status: nextStatus(item.status) }));
  }

  public toggleGrandmaStatus(id: string): void {
    this.update(id, (item) => ({ ...item, grandmaStatus: nextGrandmaStatus(item.grandmaStatus) }));
  }

  /** Moves a fragrance one or more places up (negative offset) or down the ranking. */
  public moveBy(id: string, offset: number): void {
    const from = this.state().findIndex((item) => item.id === id);
    const to = from + offset;
    if (from < 0 || to < 0 || to >= this.state().length) { return; }
    this.move(from, to);
  }

  /** Moves a fragrance to `index` in the ranking (0 is the top). */
  public moveTo(id: string, index: number): void {
    const from = this.state().findIndex((item) => item.id === id);
    if (from < 0) { return; }
    this.move(from, index);
  }

  public move(fromIndex: number, toIndex: number): void {
    this.state.update((items) => {
      const next = [...items];
      moveItemInArray(next, fromIndex, toIndex);
      return next;
    });
  }

  /** Puts fragrances in the given id order; any not listed keep their order at the end. */
  public reorder(ids: readonly string[]): void {
    this.state.update((items) => {
      const byId = new Map(items.map((item) => [item.id, item]));
      const listed = new Set(ids);
      return [
        ...ids.map((id) => byId.get(id)).filter((item) => item !== undefined),
        ...items.filter((item) => !listed.has(item.id)),
      ];
    });
  }

  public replaceAll(items: readonly FragranceData[]): void {
    this.state.set(items.map((data) => createFragrance(data)));
  }

  private update(id: string, change: (item: Fragrance) => Fragrance): void {
    this.state.update((items) => items.map((item) => (item.id === id ? change(item) : item)));
  }
}

function defaultFragrances(): Fragrance[] {
  return INITIAL_FRAGRANCES.map((data) => createFragrance(data));
}

function loadFragrances(): Fragrance[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) { return defaultFragrances(); }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) { return defaultFragrances(); }

    const items = parsed.flatMap((item: unknown) => {
      const data = toFragranceData(item);
      if (!data) { return []; }
      // Lists saved before ids existed get one on first load.
      const id = (item as Record<string, unknown>)['id'];
      return [createFragrance(data, typeof id === 'string' && id ? id : undefined)];
    });

    // An empty saved list is valid; only fall back when every stored entry was unreadable.
    return items.length > 0 || parsed.length === 0 ? items : defaultFragrances();
  } catch {
    return defaultFragrances();
  }
}

function saveFragrances(items: Fragrance[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore quota/security errors and keep app functional.
  }
}
