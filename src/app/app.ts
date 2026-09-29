import {
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import {
  Fragrance,
  FragranceData,
  FragranceStatus,
  GrandmaStatus,
  grandmaStatus,
  personalStatus,
} from './fragrance/fragrance.model';
import { formatList, parseList } from './fragrance/fragrance.format';
import { FragranceStore } from './fragrance/fragrance.store';

@Component({
  selector: 'app-root',
  imports: [DragDropModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly store = inject(FragranceStore);

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
    // `autofocus` is ignored for inputs rendered after page load, so focus manually.
    afterRenderEffect(() => {
      const input = this.renameInput()?.nativeElement;
      input?.focus();
      input?.select();
    });
  }

  /** Items matching the search, each with its rank in the full list. */
  public visibleItems = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return this.store
      .items()
      .map((item, index) => ({ item, rank: index + 1 }))
      .filter(({ item }) => item.name.toLowerCase().includes(q));
  });

  public formatted = computed(() => formatList(this.store.items()));

  public isSearchActive = computed(() => this.searchQuery().length > 0);
  public isRenaming = computed(() => this.editingId() !== null);

  /** Dragging is only enabled for the unfiltered list, so drop indexes match the store. */
  public onDrop(event: CdkDragDrop<Fragrance[]>) {
    if (this.isRenaming()) { return; }
    this.store.move(event.previousIndex, event.currentIndex);
  }

  public toggleStatus(id: string) {
    this.store.toggleStatus(id);
  }

  public toggleGrandmaStatus(id: string): void {
    this.store.toggleGrandmaStatus(id);
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
    if (this.isRenaming()) { return; }
    this.store.moveBy(id, -1);
  }

  public moveDown(id: string) {
    if (this.isRenaming()) { return; }
    this.store.moveBy(id, 1);
  }

  public removeItem(id: string) {
    if (this.isRenaming()) { return; }
    this.store.remove(id);
  }

  public addItem() {
    this.store.add(this.newName());
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
    if (!this.isEditing(id) || !this.editingName().trim()) { return; }

    this.store.rename(id, this.editingName());
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
      this.store.replaceAll(parsed);
    }
    this.showImportModal.set(false);
  }
}
