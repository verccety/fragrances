import {
	Component,
	ElementRef,
	afterRenderEffect,
	computed,
	input,
	output,
	signal,
	viewChild,
	ChangeDetectionStrategy,
} from '@angular/core';
import {CdkDragHandle} from '@angular/cdk/drag-drop';
import {Fragrance, grandmaStatus, personalStatus} from '../fragrance/fragrance.model';
import {TierId} from '../fragrance/fragrance.tiers';

/** One ranked fragrance with its rating buttons, reorder arrows and inline rename. */
@Component({
	selector: 'app-fragrance-row',
	imports: [CdkDragHandle],
	templateUrl: './fragrance-row.html',
	styleUrl: './fragrance-row.scss',
	changeDetection: ChangeDetectionStrategy.Eager,
	host: {
		class: 'frag-row',
		'[attr.data-tier]': 'tier()',
		'[class.frag-row--tier-start]': 'tierLabel() !== null',
	},
})
export class FragranceRow {
	public readonly fragrance = input.required<Fragrance>();
	public readonly rank = input.required<number>();
	public readonly tier = input<TierId>('rest');
	/** Heading shown above the row when it opens a tier, e.g. "Top 10". */
	public readonly tierLabel = input<string | null>(null);
	public readonly editing = input(false);
	/** Set while any row is being renamed: moving, removing and renaming are unavailable. */
	public readonly locked = input(false);
	/** Whether there is anything to compare with. */
	public readonly placeable = input(true);
	/** False in views where the shown order is not the full ranking, e.g. one per line. */
	public readonly reorderable = input(true);
	/** Line members hidden behind this row in the one-per-line view. */
	public readonly hiddenCount = input(0);

	public readonly toggleStatus = output();
	public readonly toggleGrandmaStatus = output();
	public readonly moveUp = output();
	public readonly moveDown = output();
	public readonly remove = output();
	public readonly place = output();
	public readonly editLine = output();
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
		if (this.locked()) {
			return;
		}
		this.draft.set(this.fragrance().name);
		this.startRename.emit();
	}

	protected saveRename(): void {
		const name = this.draft().trim();
		if (name) {
			this.rename.emit(name);
		}
	}
}
