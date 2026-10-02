import {Component, computed, input, linkedSignal, output, ChangeDetectionStrategy} from '@angular/core';
import {Fragrance} from '../fragrance/fragrance.model';
import {lineKey, listLines, suggestLines} from '../fragrance/fragrance.lines';

interface Draft {
	name: string;
	excluded: ReadonlySet<string>;
}

/** Shows groups that look like lines; checked members of each group get its (editable) name. */
@Component({
	selector: 'app-suggest-lines-dialog',
	templateUrl: './suggest-lines-dialog.html',
	styleUrl: './suggest-lines-dialog.scss',
	changeDetection: ChangeDetectionStrategy.Eager,
	host: {'(document:keydown.escape)': 'dismissed.emit()'},
})
export class SuggestLinesDialog {
	public readonly ranking = input.required<readonly Fragrance[]>();

	/** Line name per fragrance id. */
	public readonly applied = output<Map<string, string>>();
	public readonly dismissed = output();

	protected readonly suggestions = computed(() => suggestLines(this.ranking()));
	protected readonly drafts = linkedSignal<Draft[]>(() =>
		this.suggestions().map(s => ({name: s.name, excluded: new Set()})),
	);
	private readonly existingLines = computed(() => new Set(listLines(this.ranking()).map(line => line.key)));

	/** What applying would do: only groups with a name and enough checked members count. */
	protected readonly assignments = computed(() => {
		const result = new Map<string, string>();
		let groups = 0;
		this.suggestions().forEach((suggestion, i) => {
			const draft = this.drafts()[i];
			const name = draft.name.trim();
			const checked = suggestion.members.filter(m => !draft.excluded.has(m.id));
			const joinsExisting = this.existingLines().has(lineKey(name));
			if (!name || checked.length < (joinsExisting ? 1 : 2)) {
				return;
			}
			groups++;
			checked.forEach(member => result.set(member.id, name));
		});
		return {lines: result, groups};
	});

	protected rankOf(item: Fragrance): number {
		return this.ranking().indexOf(item) + 1;
	}

	protected rename(index: number, name: string): void {
		this.drafts.update(drafts => drafts.map((d, i) => (i === index ? {...d, name} : d)));
	}

	protected toggleMember(index: number, id: string): void {
		this.drafts.update(drafts =>
			drafts.map((d, i) => {
				if (i !== index) {
					return d;
				}
				const excluded = new Set(d.excluded);
				if (!excluded.delete(id)) {
					excluded.add(id);
				}
				return {...d, excluded};
			}),
		);
	}

	protected apply(): void {
		const {lines} = this.assignments();
		if (lines.size > 0) {
			this.applied.emit(lines);
		}
	}
}
