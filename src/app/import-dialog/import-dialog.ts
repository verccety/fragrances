import { Component, computed, output, signal } from '@angular/core';
import { FragranceData, grandmaStatus, personalStatus } from '../fragrance/fragrance.model';
import { parseList } from '../fragrance/fragrance.format';

const PREVIEW_LIMIT = 5;

/** Modal that parses a pasted export and offers to replace the whole list with it. */
@Component({
  selector: 'app-import-dialog',
  templateUrl: './import-dialog.html',
  styleUrl: './import-dialog.scss',
})
export class ImportDialog {
  public readonly confirmed = output<FragranceData[]>();
  public readonly dismissed = output();

  protected readonly text = signal('');
  protected readonly parsed = computed(() => parseList(this.text()));
  protected readonly preview = computed(() => this.parsed().slice(0, PREVIEW_LIMIT));
  protected readonly hiddenCount = computed(() => this.parsed().length - this.preview().length);

  protected readonly personalStatus = personalStatus;
  protected readonly grandmaStatus = grandmaStatus;

  protected confirm(): void {
    if (this.parsed().length > 0) { this.confirmed.emit(this.parsed()); }
  }
}
