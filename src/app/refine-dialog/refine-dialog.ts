import { Component, computed, input, linkedSignal, output, signal } from '@angular/core';
import { Fragrance } from '../fragrance/fragrance.model';
import {
  ComparisonTimes,
  RefineAnswer,
  RefineSession,
  answerRefine,
  refineMoves,
  startRefine,
} from '../fragrance/fragrance.refine';
import { tierChange } from '../fragrance/fragrance.tiers';
import { ComparisonCard } from '../comparison-card/comparison-card';

export interface RefineResult {
  order: string[];
  compared: string[];
}

/**
 * Asks "which do you like more?" about pairs of already ranked fragrances for as long as
 * wanted, then shows what moved. The ranking is not touched until the result is applied.
 */
@Component({
  selector: 'app-refine-dialog',
  imports: [ComparisonCard],
  templateUrl: './refine-dialog.html',
  styleUrl: './refine-dialog.scss',
  host: {
    '(document:keydown.arrowleft)': 'onArrow($event, "left")',
    '(document:keydown.arrowright)': 'onArrow($event, "right")',
    '(document:keydown.escape)': 'dismissed.emit()',
  },
})
export class RefineDialog {
  public readonly ranking = input.required<readonly Fragrance[]>();
  public readonly lastCompared = input<ComparisonTimes>({});

  public readonly finished = output<RefineResult>();
  public readonly dismissed = output();

  protected readonly session = linkedSignal(() =>
    startRefine(
      this.ranking().map((item) => item.id),
      this.lastCompared(),
    ),
  );
  /** Earlier states, so answers can be taken back one by one. */
  protected readonly history = signal<RefineSession[]>([]);
  protected readonly summaryRequested = signal(false);

  private readonly byId = computed(() => new Map(this.ranking().map((item) => [item.id, item])));

  protected readonly showSummary = computed(
    () => this.summaryRequested() || this.session().current === null,
  );
  protected readonly cards = computed(() => {
    const pair = this.session().current;
    if (!pair) { return null; }
    const upper = { item: this.byId().get(pair.upper)!, answer: 'upper' as const };
    const lower = { item: this.byId().get(pair.lower)!, answer: 'lower' as const };
    return pair.upperOnLeft ? { left: upper, right: lower } : { left: lower, right: upper };
  });
  protected readonly moves = computed(() =>
    refineMoves(this.session()).map((move) => ({
      ...move,
      item: this.byId().get(move.id)!,
      tierMove: tierChange(move.from, move.to),
    })),
  );

  protected answer(answer: RefineAnswer): void {
    this.history.update((history) => [...history, this.session()]);
    this.session.set(answerRefine(this.session(), answer, this.lastCompared()));
  }

  protected back(): void {
    const history = this.history();
    if (history.length === 0) { return; }
    this.session.set(history[history.length - 1]);
    this.history.set(history.slice(0, -1));
    this.summaryRequested.set(false);
  }

  protected finish(): void {
    const { draft, compared } = this.session();
    this.finished.emit({ order: [...draft], compared: [...compared] });
  }

  protected onArrow(event: Event, side: 'left' | 'right'): void {
    const cards = this.cards();
    if (!cards || this.showSummary()) { return; }
    event.preventDefault();
    this.answer(cards[side].answer);
  }
}
