import { Component, computed, input } from '@angular/core';
import { Fragrance, grandmaStatus, personalStatus } from '../fragrance/fragrance.model';

/** A big clickable fragrance card used when choosing between two fragrances. */
@Component({
  selector: 'button[appComparisonCard]',
  templateUrl: './comparison-card.html',
  styleUrl: './comparison-card.scss',
  host: { class: 'comparison-card', type: 'button' },
})
export class ComparisonCard {
  public readonly fragrance = input.required<Fragrance>();
  /** Small line above the name, e.g. the current rank. */
  public readonly caption = input<string | null>(null);
  /** Keyboard shortcut hint shown at the bottom. */
  public readonly keyHint = input<string | null>(null);

  protected readonly personal = computed(() => personalStatus(this.fragrance().status));
  protected readonly grandma = computed(() => grandmaStatus(this.fragrance().grandmaStatus));
}
