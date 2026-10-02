import {Component, computed, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import {CdkDrag, CdkDragDrop, CdkDragPlaceholder, CdkDropList} from '@angular/cdk/drag-drop';
import {
	Fragrance,
	FragranceData,
	FragranceStatus,
	GrandmaStatus,
	GRANDMA_STATUSES,
	PERSONAL_STATUSES,
} from './fragrance/fragrance.model';
import {formatList} from './fragrance/fragrance.format';
import {tierForRank, tierStartingAt} from './fragrance/fragrance.tiers';
import {isFilterActive, matchesFilter, toggleValue} from './fragrance/fragrance.filter';
import {collapseLines} from './fragrance/fragrance.lines';
import {backupFileName, createBackup} from './fragrance/fragrance.backup';
import {FragranceStore} from './fragrance/fragrance.store';
import {ComparisonLog} from './fragrance/fragrance.comparison-log';
import {FragranceRow} from './fragrance-row/fragrance-row';
import {ImportDialog} from './import-dialog/import-dialog';
import {PlacementDialog} from './placement-dialog/placement-dialog';
import {RefineDialog, RefineResult} from './refine-dialog/refine-dialog';
import {LineDialog} from './line-dialog/line-dialog';
import {SuggestLinesDialog} from './suggest-lines-dialog/suggest-lines-dialog';

@Component({
	selector: 'app-root',
	imports: [
		CdkDropList,
		CdkDrag,
		CdkDragPlaceholder,
		FragranceRow,
		ImportDialog,
		PlacementDialog,
		RefineDialog,
		LineDialog,
		SuggestLinesDialog,
	],
	templateUrl: './app.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	styleUrl: './app.scss',
})
export class App {
	protected readonly store = inject(FragranceStore);
	protected readonly comparisons = inject(ComparisonLog);
	protected readonly personalStatuses = PERSONAL_STATUSES;
	protected readonly grandmaStatuses = GRANDMA_STATUSES;

	protected readonly searchQuery = signal('');
	protected readonly statusFilter = signal<FragranceStatus[]>([]);
	protected readonly grandmaFilter = signal<GrandmaStatus[]>([]);
	/** Show each line only through its best-ranked member; a view, so order can't change. */
	protected readonly onePerLine = signal(false);
	protected readonly newName = signal('');
	protected readonly editingId = signal<string | null>(null);
	protected readonly showImport = signal(false);
	protected readonly placingId = signal<string | null>(null);
	protected readonly showRefine = signal(false);
	protected readonly lineEditingId = signal<string | null>(null);
	protected readonly showSuggestLines = signal(false);
	protected readonly copied = signal(false);

	protected readonly filter = computed(() => ({
		name: this.searchQuery(),
		statuses: this.statusFilter(),
		grandmaStatuses: this.grandmaFilter(),
	}));
	protected readonly isFiltering = computed(() => isFilterActive(this.filter()));
	protected readonly hasStatusFilter = computed(
		() => this.statusFilter().length > 0 || this.grandmaFilter().length > 0,
	);

	/** One chip per status, with how many fragrances in the whole list have it. */
	protected readonly personalChips = computed(() =>
		PERSONAL_STATUSES.map(option => ({
			option,
			count: this.store.items().filter(item => item.status === option.value).length,
			active: this.statusFilter().includes(option.value),
		})),
	);
	protected readonly grandmaChips = computed(() =>
		GRANDMA_STATUSES.map(option => ({
			option,
			count: this.store.items().filter(item => item.grandmaStatus === option.value).length,
			active: this.grandmaFilter().includes(option.value),
		})),
	);

	/**
	 * The ranking being viewed: the full list, or one fragrance per line. Ranks and tiers are
	 * counted within it, then search and filters narrow it down. Tier headings are only shown
	 * when nothing is filtered out, so tiers are contiguous.
	 */
	protected readonly visibleItems = computed(() => {
		const filter = this.filter();
		const filtering = this.isFiltering();
		const ranking = this.onePerLine()
			? collapseLines(this.store.items())
			: this.store.items().map(item => ({item, hiddenCount: 0}));
		return ranking
			.map(({item, hiddenCount}, index) => {
				const rank = index + 1;
				return {
					item,
					rank,
					hiddenCount,
					tier: tierForRank(rank).id,
					tierLabel: filtering ? null : (tierStartingAt(rank)?.label ?? null),
				};
			})
			.filter(({item}) => matchesFilter(item, filter));
	});

	protected readonly formatted = computed(() => formatList(this.store.items()));
	protected readonly isRenaming = computed(() => this.editingId() !== null);
	protected readonly placing = computed(() => this.store.items().find(item => item.id === this.placingId()) ?? null);
	protected readonly lineEditing = computed(
		() => this.store.items().find(item => item.id === this.lineEditingId()) ?? null,
	);
	/** Drag indexes only match the store when the full list is shown. */
	protected readonly canDrag = computed(() => !this.isFiltering() && !this.onePerLine() && !this.isRenaming());

	public onDrop(event: CdkDragDrop<Fragrance[]>): void {
		this.store.move(event.previousIndex, event.currentIndex);
	}

	protected toggleStatusFilter(status: FragranceStatus): void {
		this.statusFilter.update(values => toggleValue(values, status));
	}

	protected toggleGrandmaFilter(status: GrandmaStatus): void {
		this.grandmaFilter.update(values => toggleValue(values, status));
	}

	protected clearStatusFilters(): void {
		this.statusFilter.set([]);
		this.grandmaFilter.set([]);
	}

	protected addItem(): void {
		this.store.add(this.newName());
		this.newName.set('');
	}

	protected startRename(id: string): void {
		if (!this.isRenaming()) {
			this.editingId.set(id);
		}
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
		const blob = new Blob([createBackup(this.store.items(), now)], {type: 'application/json'});
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = backupFileName(now);
		link.click();
		// Revoking right away can cancel the download in some browsers (notably iOS Safari).
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	}

	protected startPlacement(id: string): void {
		if (!this.isRenaming()) {
			this.placingId.set(id);
		}
	}

	protected applyPlacement(id: string, index: number): void {
		this.store.moveTo(id, index);
		this.placingId.set(null);
	}

	protected editLine(id: string): void {
		if (!this.isRenaming()) {
			this.lineEditingId.set(id);
		}
	}

	protected setLine(id: string, line: string | null): void {
		this.store.setLine(id, line);
		this.lineEditingId.set(null);
	}

	protected openSuggestLines(): void {
		this.cancelRename();
		this.showSuggestLines.set(true);
	}

	protected applySuggestedLines(lines: Map<string, string>): void {
		this.store.setLines(lines);
		this.showSuggestLines.set(false);
	}

	protected openRefine(): void {
		this.cancelRename();
		this.showRefine.set(true);
	}

	protected finishRefine({order, compared}: RefineResult): void {
		this.store.reorder(order);
		this.comparisons.record(compared);
		this.showRefine.set(false);
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
