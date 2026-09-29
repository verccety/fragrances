import {
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CdkDragHandle } from '@angular/cdk/drag-drop';
import { Fragrance, grandmaStatus, personalStatus } from '../fragrance/fragrance.model';

/** One ranked fragrance with its rating buttons, reorder arrows and inline rename. */
@Component({
  selector: 'app-fragrance-row',
  imports: [CdkDragHandle],
  templateUrl: './fragrance-row.html',
  styleUrl: './fragrance-row.scss',
  host: { class: 'frag-row' },
})
export class FragranceRow {
  public readonly fragrance = input.required<Fragrance>();
  public readonly rank = input.required<number>();
  public readonly editing = input(false);
  /** Set while any row is being renamed: moving, removing and renaming are unavailable. */
  public readonly locked = input(false);

  public readonly toggleStatus = output();
  public readonly toggleGrandmaStatus = output();
  public readonly moveUp = output();
  public readonly moveDown = output();
  public readonly remove = output();
  public readonly startRename = output();
  public readonly rename = output<string>();
  public readonly cancelRename = output();

  protected readonly draft = signal('');
  protected readonly personal = computed(() => personalStatus(this.fragrance().status));
  protected readonly grandma = computed(() => grandmaStatus(this.fragrance().grandmaStatus));

  private readonly renameInput = viewChild<ElementRef<HTMLInputElement>>('renameInput');

  constructor() {
    // `autofocus` is ignored for inputs rendered after page load, so focus manually.
    afterRenderEffect(() => {
      const input = this.renameInput()?.nativeElement;
      input?.focus();
      input?.select();
    });
  }

  protected beginRename(): void {
    if (this.locked()) { return; }
    this.draft.set(this.fragrance().name);
    this.startRename.emit();
  }

  protected saveRename(): void {
    const name = this.draft().trim();
    if (name) { this.rename.emit(name); }
  }
}
