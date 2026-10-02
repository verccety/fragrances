import {Component, computed, output, signal, ChangeDetectionStrategy} from '@angular/core';
import {FragranceData, grandmaStatus, personalStatus} from '../fragrance/fragrance.model';
import {parseList} from '../fragrance/fragrance.format';
import {readBackup} from '../fragrance/fragrance.backup';

const PREVIEW_LIMIT = 5;

/**
 * Modal that reads a pasted text export or a JSON backup file
 * and offers to replace the whole list with it.
 */
@Component({
	selector: 'app-import-dialog',
	templateUrl: './import-dialog.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	styleUrl: './import-dialog.scss',
})
export class ImportDialog {
	public readonly confirmed = output<FragranceData[]>();
	public readonly dismissed = output();

	protected readonly text = signal('');
	/** A successfully read backup file; typing in the text area discards it. */
	protected readonly file = signal<{name: string; items: FragranceData[]} | null>(null);
	protected readonly fileError = signal<string | null>(null);

	protected readonly parsed = computed(() => this.file()?.items ?? parseList(this.text()));
	protected readonly preview = computed(() => this.parsed().slice(0, PREVIEW_LIMIT));
	protected readonly hiddenCount = computed(() => this.parsed().length - this.preview().length);

	protected readonly personalStatus = personalStatus;
	protected readonly grandmaStatus = grandmaStatus;

	protected onTextInput(text: string): void {
		this.text.set(text);
		this.file.set(null);
		this.fileError.set(null);
	}

	protected async onFileSelected(input: HTMLInputElement): Promise<void> {
		const selected = input.files?.[0];
		input.value = ''; // allow picking the same file again
		if (!selected) {
			return;
		}

		const result = readBackup(await selected.text());
		if (result.ok) {
			this.text.set('');
			this.file.set({name: selected.name, items: result.items});
			this.fileError.set(null);
		} else {
			this.file.set(null);
			this.fileError.set(`${selected.name}: ${result.error}`);
		}
	}

	protected confirm(): void {
		if (this.parsed().length > 0) {
			this.confirmed.emit(this.parsed());
		}
	}
}
