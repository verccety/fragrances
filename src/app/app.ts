import { Component, computed, inject, signal } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDragPlaceholder, CdkDropList } from '@angular/cdk/drag-drop';
import {
  Fragrance,
  FragranceData,
  GRANDMA_STATUSES,
  PERSONAL_STATUSES,
} from './fragrance/fragrance.model';
import { formatList } from './fragrance/fragrance.format';
import { FragranceStore } from './fragrance/fragrance.store';
import { FragranceRow } from './fragrance-row/fragrance-row';
import { ImportDialog } from './import-dialog/import-dialog';

@Component({
  selector: 'app-root',
  imports: [CdkDropList, CdkDrag, CdkDragPlaceholder, FragranceRow, ImportDialog],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly store = inject(FragranceStore);
  protected readonly personalStatuses = PERSONAL_STATUSES;
  protected readonly grandmaStatuses = GRANDMA_STATUSES;

  protected readonly searchQuery = signal('');
  protected readonly newName = signal('');
  protected readonly editingId = signal<string | null>(null);
  protected readonly showImport = signal(false);
  protected readonly copied = signal(false);

  /** Items matching the search, each with its rank in the full list. */
  protected readonly visibleItems = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return this.store
      .items()
      .map((item, index) => ({ item, rank: index + 1 }))
      .filter(({ item }) => item.name.toLowerCase().includes(q));
  });

  protected readonly formatted = computed(() => formatList(this.store.items()));
  protected readonly isRenaming = computed(() => this.editingId() !== null);
  /** Drag indexes only match the store when the full list is shown. */
  protected readonly canDrag = computed(() => !this.searchQuery() && !this.isRenaming());

  public onDrop(event: CdkDragDrop<Fragrance[]>): void {
    this.store.move(event.previousIndex, event.currentIndex);
  }

  protected addItem(): void {
    this.store.add(this.newName());
    this.newName.set('');
  }

  protected startRename(id: string): void {
    if (!this.isRenaming()) { this.editingId.set(id); }
  }

  protected rename(id: string, name: string): void {
    this.store.rename(id, name);
    this.cancelRename();
  }

  protected cancelRename(): void {
    this.editingId.set(null);
  }

  protected copyToClipboard(): void {
    navigator.clipboard.writeText(this.formatted()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  protected openImport(): void {
    this.cancelRename();
    this.showImport.set(true);
  }

  protected importList(items: FragranceData[]): void {
    this.store.replaceAll(items);
    this.showImport.set(false);
  }
}
