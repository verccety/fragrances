import { Component, computed, input, linkedSignal, output, signal } from '@angular/core';
import { Fragrance } from '../fragrance/fragrance.model';
import {
  PlacementAnswer,
  PlacementSearch,
  answerPlacement,
  maxPlacementQuestions,
  opponentIndex,
  startPlacement,
} from '../fragrance/fragrance.placement';
import { tierChange } from '../fragrance/fragrance.tiers';
import { ComparisonCard } from '../comparison-card/comparison-card';

/**
 * Finds where a fragrance belongs by asking which of two fragrances is liked more,
 * then shows the new rank for confirmation. The ranking is not touched until applied.
 */
@Component({
  selector: 'app-placement-dialog',
  imports: [ComparisonCard],
  templateUrl: './placement-dialog.html',
  styleUrl: './placement-dialog.scss',
  host: {
    '(document:keydown.arrowleft)': 'onArrow($event, "better")',
    '(document:keydown.arrowright)': 'onArrow($event, "worse")',
    '(document:keydown.escape)': 'dismissed.emit()',
  },
})
export class PlacementDialog {
  /** The fragrance being placed. */
  public readonly fragrance = input.required<Fragrance>();
  /** The full ranking, including the placed fragrance. */
  public readonly ranking = input.required<readonly Fragrance[]>();

  /** Emits the new index in the full ranking (0 is the top). */
  public readonly placed = output<number>();
  public readonly dismissed = output();

  private readonly others = computed(() =>
    this.ranking().filter((item) => item.id !== this.fragrance().id),
  );

  protected readonly search = linkedSignal(() => startPlacement(this.others().length));
  /** Earlier states, so answers can be taken back one by one. */
  protected readonly history = signal<PlacementSearch[]>([]);

  protected readonly currentRank = computed(
    () => this.ranking().findIndex((item) => item.id === this.fragrance().id) + 1,
  );
  protected readonly newRank = computed(() => {
    const result = this.search().result;
    return result === null ? null : result + 1;
  });
  protected readonly tierMove = computed(() => {
    const newRank = this.newRank();
    return newRank === null ? null : tierChange(this.currentRank(), newRank);
  });
  protected readonly opponent = computed(() => {
    if (this.search().result !== null) { return null; }
    const item = this.others()[opponentIndex(this.search())];
    return { item, rank: this.ranking().indexOf(item) + 1 };
  });
  protected readonly questionNumber = computed(() => this.history().length + 1);
  protected readonly maxQuestions = computed(() => maxPlacementQuestions(this.others().length));

  protected answer(answer: PlacementAnswer): void {
    this.history.update((history) => [...history, this.search()]);
    this.search.set(answerPlacement(this.search(), answer));
  }

  protected back(): void {
    const history = this.history();
    if (history.length === 0) { return; }
    this.search.set(history[history.length - 1]);
    this.history.set(history.slice(0, -1));
  }

  protected apply(): void {
    const result = this.search().result;
    if (result !== null) { this.placed.emit(result); }
  }

  protected onArrow(event: Event, answer: PlacementAnswer): void {
    if (!this.opponent()) { return; }
    event.preventDefault();
    this.answer(answer);
  }
}
