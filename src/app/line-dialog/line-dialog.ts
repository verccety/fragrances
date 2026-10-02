import {
  Component,
  ElementRef,
  afterNextRender,
  computed,
  input,
  linkedSignal,
  output,
  viewChild,
} from '@angular/core';
import { Fragrance } from '../fragrance/fragrance.model';
import { lineKey, listLines, matchingLines } from '../fragrance/fragrance.lines';

/** Puts one fragrance into an existing or new line, or takes it out of its line. */
@Component({
  selector: 'app-line-dialog',
  templateUrl: './line-dialog.html',
  styleUrl: './line-dialog.scss',
  host: { '(document:keydown.escape)': 'dismissed.emit()' },
})
export class LineDialog {
  public readonly fragrance = input.required<Fragrance>();
  public readonly ranking = input.required<readonly Fragrance[]>();

  /** The chosen line name, or `null` to take the fragrance out of its line. */
  public readonly chosen = output<string | null>();
  public readonly dismissed = output();

  /** Search text that doubles as the name of a new line; starts as the fragrance's name. */
  protected readonly text = linkedSignal(() => this.fragrance().name);

  private readonly lines = computed(() => listLines(this.ranking()));
  protected readonly currentLine = computed(() => {
    const line = this.fragrance().line;
    return line ? (this.lines().find((l) => l.key === lineKey(line)) ?? null) : null;
  });
  protected readonly options = computed(() => matchingLines(this.lines(), this.text()));
  /** An existing line with exactly this name (ignoring case), picked instead of a duplicate. */
  protected readonly exactMatch = computed(
    () => this.lines().find((line) => line.key === lineKey(this.text())) ?? null,
  );

  private readonly input = viewChild<ElementRef<HTMLInputElement>>('lineInput');

  constructor() {
    afterNextRender(() => {
      const input = this.input()?.nativeElement;
      input?.focus();
      input?.select();
    });
  }

  protected submit(): void {
    const name = this.exactMatch()?.name ?? this.text().trim();
    if (name) { this.chosen.emit(name); }
  }
}
