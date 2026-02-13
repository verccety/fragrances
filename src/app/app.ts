import { Component, computed, effect, signal } from '@angular/core';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import {
  Fragrance,
  FragranceStatus,
  nextStatus,
  statusIcon,
  formatList,
  parseList,
} from './fragrance.model';
import { INITIAL_FRAGRANCES } from './fragrance.data';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DragDropModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly storageKey = 'fragrance-app.items.v1';

  public items = signal<Fragrance[]>(this.loadItems());
  public searchQuery = signal('');
  public newName = signal('');
  public showImportModal = signal(false);
  public importText = signal('');
  public importPreview = signal<Fragrance[]>([]);
  public copied = signal(false);

  constructor() {
    effect(() => {
      this.saveItems(this.items());
    });
  }

  public stats = computed(() => {
    const all = this.items();
    return {
      total: all.length,
      enjoy: all.filter((f) => f.status === 'enjoy').length,
      dislike: all.filter((f) => f.status === 'dislike').length,
    };
  });

  public filteredItems = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const all = this.items();
    if (!q) { return all.map((item, index) => ({ item, index })); }
    return all
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.name.toLowerCase().includes(q));
  });

  public formatted = computed(() => formatList(this.items()));

  public isSearchActive = computed(() => this.searchQuery().length > 0);

  public onDrop(event: CdkDragDrop<Fragrance[]>) {
    const current = [...this.items()];
    const filtered = this.filteredItems();
    const realPrevIndex = filtered[event.previousIndex].index;
    const realCurrIndex = filtered[event.currentIndex].index;
    moveItemInArray(current, realPrevIndex, realCurrIndex);
    this.items.set(current);
  }

  public toggleStatus(realIndex: number) {
    this.items.update((items) =>
      items.map((it, i) => (i === realIndex ? { ...it, status: nextStatus(it.status) } : it)),
    );
  }

  public getStatusIcon(status: FragranceStatus): string {
    return statusIcon(status);
  }

  public moveUp(realIndex: number) {
    if (realIndex <= 0) { return; }
    const current = [...this.items()];
    [current[realIndex - 1], current[realIndex]] = [current[realIndex], current[realIndex - 1]];
    this.items.set(current);
  }

  public moveDown(realIndex: number) {
    const current = [...this.items()];
    if (realIndex >= current.length - 1) { return; }
    [current[realIndex], current[realIndex + 1]] = [current[realIndex + 1], current[realIndex]];
    this.items.set(current);
  }

  public removeItem(realIndex: number) {
    this.items.update((items) => items.filter((_, i) => i !== realIndex));
  }

  public addItem() {
    const name = this.newName().trim();
    if (!name) { return; }
    this.items.update((items) => [...items, { name, status: null }]);
    this.newName.set('');
  }

  public addOnEnter(event: KeyboardEvent) {
    if (event.key === 'Enter') { this.addItem(); }
  }

  public copyToClipboard() {
    navigator.clipboard.writeText(this.formatted()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  public openImport() {
    this.importText.set('');
    this.importPreview.set([]);
    this.showImportModal.set(true);
  }

  public closeImport() {
    this.showImportModal.set(false);
  }

  public onImportTextChange(text: string) {
    this.importText.set(text);
    this.importPreview.set(parseList(text));
  }

  public confirmImport() {
    const parsed = this.importPreview();
    if (parsed.length > 0) {
      this.items.set(parsed);
    }
    this.showImportModal.set(false);
  }

  private loadItems(): Fragrance[] {
    if (typeof window === 'undefined') { return structuredClone(INITIAL_FRAGRANCES); }

    try {
      const raw = window.localStorage.getItem(this.storageKey);
      if (!raw) { return structuredClone(INITIAL_FRAGRANCES); }

      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) { return structuredClone(INITIAL_FRAGRANCES); }

      const items = parsed
        .filter(
          (item): item is { name: unknown; status: unknown } =>
            item !== null && typeof item === 'object',
        )
        .map((item) => ({
          name: String(item.name ?? '').trim(),
          status: this.normalizeStatus(item.status),
        }))
        .filter((item) => item.name.length > 0);

      return items.length > 0 ? items : structuredClone(INITIAL_FRAGRANCES);
    } catch {
      return structuredClone(INITIAL_FRAGRANCES);
    }
  }

  private saveItems(items: Fragrance[]): void {
    if (typeof window === 'undefined') { return; }

    try {
      window.localStorage.setItem(this.storageKey, JSON.stringify(items));
    } catch {
      // Ignore quota/security errors and keep app functional.
    }
  }

  private normalizeStatus(status: unknown): FragranceStatus {
    if (status === 'enjoy' || status === 'dislike' || status === null) { return status; }
    return null;
  }
}
