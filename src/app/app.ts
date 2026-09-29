import { Component, computed, inject, signal } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDragPlaceholder, CdkDropList } from '@angular/cdk/drag-drop';
import {
  Fragrance,
  FragranceData,
  GRANDMA_STATUSES,
  PERSONAL_STATUSES,
} from './fragrance/fragrance.model';
import { formatList } from './fragrance/fragrance.format';
import { backupFileName, createBackup } from './fragrance/fragrance.backup';
import { FragranceStore } from './fragrance/fragrance.store';
import { FragranceRow } from './fragrance-row/fragrance-row';
import { ImportDialog } from './import-dialog/import-dialog';
import { PlacementDialog } from './placement-dialog/placement-dialog';

@Component({
  selector: 'app-root',
  imports: [CdkDropList, CdkDrag, CdkDragPlaceholder, FragranceRow, ImportDialog, PlacementDialog],
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
  protected readonly placingId = signal<string | null>(null);
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
  protected readonly placing = computed(
    () => this.store.items().find((item) => item.id === this.placingId()) ?? null,
  );
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

  protected downloadBackup(): void {
    const now = new Date();
    const blob = new Blob([createBackup(this.store.items(), now)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = backupFileName(now);
    link.click();
    // Revoking right away can cancel the download in some browsers (notably iOS Safari).
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  protected startPlacement(id: string): void {
    if (!this.isRenaming()) { this.placingId.set(id); }
  }

  protected applyPlacement(id: string, index: number): void {
    this.store.moveTo(id, index);
    this.placingId.set(null);
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
