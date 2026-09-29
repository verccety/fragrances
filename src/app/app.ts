import {
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  effect,
  signal,
  viewChild,
} from '@angular/core';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import {
  Fragrance,
  FragranceData,
  FragranceStatus,
  GrandmaStatus,
  createFragrance,
  grandmaStatus,
  nextGrandmaStatus,
  nextStatus,
  personalStatus,
  toFragranceStatus,
  toGrandmaStatus,
} from './fragrance.model';
import { formatList, parseList } from './fragrance.format';
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
  public editingId = signal<string | null>(null);
  public editingName = signal('');
  public showImportModal = signal(false);
  public importText = signal('');
  public importPreview = signal<FragranceData[]>([]);
  public copied = signal(false);

  private readonly renameInput = viewChild<ElementRef<HTMLInputElement>>('renameInput');

  constructor() {
    effect(() => {
      this.saveItems(this.items());
    });

    // `autofocus` is ignored for inputs rendered after page load, so focus manually.
    afterRenderEffect(() => {
      const input = this.renameInput()?.nativeElement;
      input?.focus();
      input?.select();
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

  /** Items matching the search, each with its rank in the full list. */
  public visibleItems = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return this.items()
      .map((item, index) => ({ item, rank: index + 1 }))
      .filter(({ item }) => item.name.toLowerCase().includes(q));
  });

  public formatted = computed(() => formatList(this.items()));

  public isSearchActive = computed(() => this.searchQuery().length > 0);
  public isRenaming = computed(() => this.editingId() !== null);

  /** Dragging is only enabled for the unfiltered list, so drop indexes match `items`. */
  public onDrop(event: CdkDragDrop<Fragrance[]>) {
    if (this.isRenaming()) { return; }
    const current = [...this.items()];
    moveItemInArray(current, event.previousIndex, event.currentIndex);
    this.items.set(current);
  }

  public toggleStatus(id: string) {
    this.updateItem(id, (item) => ({ ...item, status: nextStatus(item.status) }));
  }

  public toggleGrandmaStatus(id: string): void {
    this.updateItem(id, (item) => ({ ...item, grandmaStatus: nextGrandmaStatus(item.grandmaStatus) }));
  }

  public getStatusIcon(status: FragranceStatus): string {
    return personalStatus(status).icon;
  }

  public getGrandmaStatusIcon(status: GrandmaStatus): string {
    return grandmaStatus(status).icon;
  }

  public getGrandmaStatusLabel(status: GrandmaStatus): string {
    return grandmaStatus(status).label;
  }

  public moveUp(id: string) {
    this.moveBy(id, -1);
  }

  public moveDown(id: string) {
    this.moveBy(id, 1);
  }

  public removeItem(id: string) {
    if (this.isRenaming()) { return; }
    this.items.update((items) => items.filter((item) => item.id !== id));
  }

  public addItem() {
    const name = this.newName().trim();
    if (!name) { return; }
    this.items.update((items) => [
      ...items,
      createFragrance({ name, status: null, grandmaStatus: 'unknown' }),
    ]);
    this.newName.set('');
  }

  public addOnEnter(event: KeyboardEvent) {
    if (event.key === 'Enter') { this.addItem(); }
  }

  public isEditing(id: string): boolean {
    return this.editingId() === id;
  }

  public startRename(item: Fragrance) {
    if (this.isRenaming()) { return; }

    this.editingId.set(item.id);
    this.editingName.set(item.name);
  }

  public saveRename(id: string) {
    if (!this.isEditing(id)) { return; }

    const name = this.editingName().trim();
    if (!name) { return; }

    this.updateItem(id, (item) => ({ ...item, name }));
    this.cancelRename();
  }

  public cancelRename() {
    this.editingId.set(null);
    this.editingName.set('');
  }

  public handleRenameKeydown(event: KeyboardEvent, id: string) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.saveRename(id);
    }
  }

  public copyToClipboard() {
    navigator.clipboard.writeText(this.formatted()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  public openImport() {
    this.cancelRename();
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
      this.cancelRename();
      this.items.set(parsed.map((data) => createFragrance(data)));
    }
    this.showImportModal.set(false);
  }

  private updateItem(id: string, change: (item: Fragrance) => Fragrance): void {
    this.items.update((items) => items.map((item) => (item.id === id ? change(item) : item)));
  }

  private moveBy(id: string, offset: number): void {
    if (this.isRenaming()) { return; }
    const current = [...this.items()];
    const from = current.findIndex((item) => item.id === id);
    const to = from + offset;
    if (from < 0 || to < 0 || to >= current.length) { return; }
    moveItemInArray(current, from, to);
    this.items.set(current);
  }

  private loadItems(): Fragrance[] {
    const defaults = () => INITIAL_FRAGRANCES.map((data) => createFragrance(data));
    if (typeof window === 'undefined') { return defaults(); }

    try {
      const raw = window.localStorage.getItem(this.storageKey);
      if (!raw) { return defaults(); }

      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) { return defaults(); }

      const items = parsed
        .filter(
          (item): item is Record<string, unknown> => item !== null && typeof item === 'object',
        )
        .map((item) =>
          createFragrance(
            {
              name: String(item['name'] ?? '').trim(),
              status: toFragranceStatus(item['status']),
              grandmaStatus: toGrandmaStatus(item['grandmaStatus']),
            },
            // Lists saved before ids existed get one on first load.
            typeof item['id'] === 'string' && item['id'] ? item['id'] : undefined,
          ),
        )
        .filter((item) => item.name.length > 0);

      // An empty saved list is valid; only fall back when every stored entry was unreadable.
      return items.length > 0 || parsed.length === 0 ? items : defaults();
    } catch {
      return defaults();
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
}
