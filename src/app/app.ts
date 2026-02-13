import { Component, signal, computed } from '@angular/core';
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
  public items = signal<Fragrance[]>(structuredClone(INITIAL_FRAGRANCES));
  public searchQuery = signal('');
  public newName = signal('');
  public showImportModal = signal(false);
  public importText = signal('');
  public importPreview = signal<Fragrance[]>([]);
  public copied = signal(false);

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
    if (!q) return all.map((item, index) => ({ item, index }));
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
      items.map((it, i) =>
        i === realIndex ? { ...it, status: nextStatus(it.status) } : it
      )
    );
  }

  public getStatusIcon(status: FragranceStatus): string {
    return statusIcon(status);
  }

  public moveUp(realIndex: number) {
    if (realIndex <= 0) return;
    const current = [...this.items()];
    [current[realIndex - 1], current[realIndex]] = [current[realIndex], current[realIndex - 1]];
    this.items.set(current);
  }

  public moveDown(realIndex: number) {
    const current = [...this.items()];
    if (realIndex >= current.length - 1) return;
    [current[realIndex], current[realIndex + 1]] = [current[realIndex + 1], current[realIndex]];
    this.items.set(current);
  }

  public removeItem(realIndex: number) {
    this.items.update((items) => items.filter((_, i) => i !== realIndex));
  }

  public addItem() {
    const name = this.newName().trim();
    if (!name) return;
    this.items.update((items) => [...items, { name, status: null }]);
    this.newName.set('');
  }

  public addOnEnter(event: KeyboardEvent) {
    if (event.key === 'Enter') this.addItem();
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
}
