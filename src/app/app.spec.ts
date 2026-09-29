import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { App } from './app';
import { Fragrance, FragranceData } from './fragrance/fragrance.model';
import { formatList } from './fragrance/fragrance.format';
import { INITIAL_FRAGRANCES } from './fragrance/fragrance.data';

const STORAGE_KEY = 'fragrance-app.items.v1';

const SAMPLE: FragranceData[] = [
  { name: 'Creed Aventus', status: 'enjoy', grandmaStatus: 'liked' },
  { name: 'Xerjoff Naxos', status: null, grandmaStatus: 'unknown' },
  { name: 'Tom Ford Noir Extreme', status: 'dislike', grandmaStatus: 'disliked' },
  { name: 'Kilian Smoking Hot', status: null, grandmaStatus: 'indifferent' },
];

function seed(items: unknown): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/** Saved items reduced to the user-visible fields, so extra stored fields don't break tests. */
function savedItems(): FragranceData[] {
  const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Fragrance[];
  return raw.map(({ name, status, grandmaStatus }) => ({ name, status, grandmaStatus }));
}

class Page {
  constructor(public readonly fixture: ComponentFixture<App>) {}

  public get root(): HTMLElement {
    return this.fixture.nativeElement as HTMLElement;
  }

  public query<T extends HTMLElement = HTMLElement>(
    selector: string,
    from: ParentNode = this.root,
  ): T {
    const el = from.querySelector<T>(selector);
    if (!el) {
      throw new Error(`Element not found: ${selector}`);
    }
    return el;
  }

  public queryAll<T extends HTMLElement = HTMLElement>(
    selector: string,
    from: ParentNode = this.root,
  ): T[] {
    return Array.from(from.querySelectorAll<T>(selector));
  }

  public exists(selector: string, from: ParentNode = this.root): boolean {
    return from.querySelector(selector) !== null;
  }

  public rows(): HTMLElement[] {
    return this.queryAll('.frag-row');
  }

  public row(name: string): HTMLElement {
    const row = this.rows().find(
      (r) => r.querySelector('.frag-row__name')?.textContent?.trim() === name,
    );
    if (!row) {
      throw new Error(`Row not found: ${name}`);
    }
    return row;
  }

  public names(): string[] {
    return this.rows().map((r) => r.querySelector('.frag-row__name')?.textContent?.trim() ?? '');
  }

  public ranks(): string[] {
    return this.rows().map((r) => this.query('.frag-row__rank', r).textContent!.trim());
  }

  public personal(row: HTMLElement): string {
    return this.query('.frag-row__status', row).textContent!.trim();
  }

  public grandma(row: HTMLElement): string {
    return this.query('.frag-row__grandma-status', row).getAttribute('aria-label')!;
  }

  public grandmaIcon(row: HTMLElement): string {
    return this.query('.frag-row__grandma-status [aria-hidden]', row).textContent!.trim();
  }

  public stats(): string[] {
    return this.queryAll('.stats__item').map((s) => s.textContent!.trim());
  }

  public exportText(): string {
    return this.query<HTMLTextAreaElement>('.export-section__textarea').value;
  }

  public async click(target: HTMLElement | string): Promise<void> {
    this.el(target).click();
    await this.fixture.whenStable();
  }

  public async dblclick(target: HTMLElement | string): Promise<void> {
    this.el(target).dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await this.fixture.whenStable();
  }

  public async type(target: HTMLElement | string, value: string): Promise<void> {
    const input = this.el(target) as HTMLInputElement | HTMLTextAreaElement;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await this.fixture.whenStable();
  }

  public async press(target: HTMLElement | string | Document, key: string): Promise<void> {
    const el = target instanceof Document ? target : this.el(target);
    el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    await this.fixture.whenStable();
  }

  public async search(query: string): Promise<void> {
    await this.type('.search-area__input', query);
  }

  private el(target: HTMLElement | string): HTMLElement {
    return typeof target === 'string' ? this.query(target) : target;
  }
}

async function render(): Promise<Page> {
  const fixture = TestBed.createComponent(App);
  await fixture.whenStable();
  return new Page(fixture);
}

/** Simulates a page reload: a fresh injector, so only localStorage survives. */
async function reload(): Promise<Page> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [App] });
  return render();
}

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [App] });
  });

  describe('loading', () => {
    it('starts with the default collection when nothing is saved', async () => {
      const page = await render();

      expect(page.rows()).toHaveLength(INITIAL_FRAGRANCES.length);
      expect(page.names()[0]).toBe(INITIAL_FRAGRANCES[0].name);
    });

    it('shows the saved list in order', async () => {
      seed(SAMPLE);
      const page = await render();

      expect(page.names()).toEqual(SAMPLE.map((f) => f.name));
      expect(page.ranks()).toEqual(['1', '2', '3', '4']);
    });

    it('keeps an empty saved list empty', async () => {
      seed([]);
      const page = await render();

      expect(page.rows()).toHaveLength(0);
      expect(page.stats()).toEqual(['Total: 0', '✅ Enjoyed: 0', '🚩 Disliked: 0']);
    });

    it('repairs invalid entries and drops the ones without a name', async () => {
      seed([
        { name: '  Trimmed  ', status: 'weird', grandmaStatus: 'nope' },
        { name: 'Before grandma', status: 'enjoy' },
        { name: '   ', status: 'enjoy' },
        { status: 'enjoy' },
        null,
        42,
      ]);
      const page = await render();

      expect(page.names()).toEqual(['Trimmed', 'Before grandma']);
      expect(page.personal(page.row('Trimmed'))).toBe('○');
      expect(page.grandma(page.row('Trimmed'))).toBe('Grandma approved: Unknown');
      expect(page.personal(page.row('Before grandma'))).toBe('✅');
      expect(page.grandma(page.row('Before grandma'))).toBe('Grandma approved: Unknown');
    });

    it.each([
      ['corrupted JSON', '{oops'],
      ['a non-array value', JSON.stringify({ name: 'Creed Aventus' })],
      ['only unreadable entries', JSON.stringify([{ name: '' }, null])],
    ])('falls back to the default collection for %s', async (_, raw) => {
      localStorage.setItem(STORAGE_KEY, raw);
      const page = await render();

      expect(page.rows()).toHaveLength(INITIAL_FRAGRANCES.length);
    });
  });

  describe('persistence', () => {
    it('saves the default collection on first start', async () => {
      await render();

      expect(savedItems()).toEqual(INITIAL_FRAGRANCES);
    });

    it('gives lists saved without ids a unique id per fragrance and keeps them', async () => {
      seed(SAMPLE);
      await render();
      const savedIds = () =>
        (JSON.parse(localStorage.getItem(STORAGE_KEY)!) as Fragrance[]).map((f) => f.id);

      const ids = savedIds();
      expect(ids.every((id) => typeof id === 'string' && id.length > 0)).toBe(true);
      expect(new Set(ids).size).toBe(SAMPLE.length);

      await reload();

      expect(savedIds()).toEqual(ids);
    });

    it('keeps changes after a reload', async () => {
      seed(SAMPLE);
      const page = await render();
      await page.click(page.query('.frag-row__status', page.row('Xerjoff Naxos')));

      const reloaded = await reload();

      expect(reloaded.personal(reloaded.row('Xerjoff Naxos'))).toBe('✅');
    });
  });

  describe('stats', () => {
    it('counts total, enjoyed and disliked fragrances', async () => {
      seed(SAMPLE);
      const page = await render();

      expect(page.stats()).toEqual(['Total: 4', '✅ Enjoyed: 1', '🚩 Disliked: 1']);

      await page.click(page.query('.frag-row__status', page.row('Xerjoff Naxos')));

      expect(page.stats()).toEqual(['Total: 4', '✅ Enjoyed: 2', '🚩 Disliked: 1']);
    });
  });

  describe('adding', () => {
    beforeEach(() => seed(SAMPLE));

    it('appends a trimmed fragrance with no ratings and clears the input', async () => {
      const page = await render();

      await page.type('.controls__input', '  Amouage Outlands  ');
      await page.click('.btn--add');

      const row = page.rows()[4];
      expect(page.names()[4]).toBe('Amouage Outlands');
      expect(page.query('.frag-row__rank', row).textContent!.trim()).toBe('5');
      expect(page.personal(row)).toBe('○');
      expect(page.grandma(row)).toBe('Grandma approved: Unknown');
      expect(page.query<HTMLInputElement>('.controls__input').value).toBe('');
      expect(savedItems()[4]).toEqual({
        name: 'Amouage Outlands',
        status: null,
        grandmaStatus: 'unknown',
      });
    });

    it('adds on Enter', async () => {
      const page = await render();

      await page.type('.controls__input', 'Amouage Outlands');
      await page.press('.controls__input', 'Enter');

      expect(page.names()).toContain('Amouage Outlands');
    });

    it('ignores a blank name', async () => {
      const page = await render();

      await page.type('.controls__input', '   ');
      await page.click('.btn--add');

      expect(page.rows()).toHaveLength(4);
    });
  });

  describe('ratings', () => {
    beforeEach(() => seed(SAMPLE));

    it('cycles the personal status: none → enjoy → dislike → none', async () => {
      const page = await render();
      const button = () => page.query('.frag-row__status', page.row('Xerjoff Naxos'));

      const seen = [page.personal(page.row('Xerjoff Naxos'))];
      for (let i = 0; i < 3; i++) {
        await page.click(button());
        seen.push(page.personal(page.row('Xerjoff Naxos')));
      }

      expect(seen).toEqual(['○', '✅', '🚩', '○']);
    });

    it('cycles the grandma status: unknown → disliked → liked → indifferent → unknown', async () => {
      const page = await render();
      const row = () => page.row('Xerjoff Naxos');

      const seen = [[page.grandmaIcon(row()), page.grandma(row())]];
      for (let i = 0; i < 4; i++) {
        await page.click(page.query('.frag-row__grandma-status', row()));
        seen.push([page.grandmaIcon(row()), page.grandma(row())]);
      }

      expect(seen).toEqual([
        ['❔', 'Grandma approved: Unknown'],
        ['👎', 'Grandma approved: Disliked'],
        ['👍', 'Grandma approved: Liked'],
        ['➖', 'Grandma approved: Indifferent'],
        ['❔', 'Grandma approved: Unknown'],
      ]);
    });

    it('changes only the clicked fragrance and saves it', async () => {
      const page = await render();

      await page.click(page.query('.frag-row__status', page.row('Xerjoff Naxos')));
      await page.click(page.query('.frag-row__grandma-status', page.row('Xerjoff Naxos')));

      expect(savedItems()).toEqual([
        SAMPLE[0],
        { name: 'Xerjoff Naxos', status: 'enjoy', grandmaStatus: 'disliked' },
        SAMPLE[2],
        SAMPLE[3],
      ]);
    });
  });

  describe('reordering', () => {
    beforeEach(() => seed(SAMPLE));

    const up = (page: Page, name: string) => page.queryAll('.frag-row__arrow', page.row(name))[0];
    const down = (page: Page, name: string) => page.queryAll('.frag-row__arrow', page.row(name))[1];

    it('moves a fragrance up', async () => {
      const page = await render();

      await page.click(up(page, 'Tom Ford Noir Extreme'));

      expect(page.names()).toEqual([
        'Creed Aventus',
        'Tom Ford Noir Extreme',
        'Xerjoff Naxos',
        'Kilian Smoking Hot',
      ]);
      expect(savedItems().map((f) => f.name)).toEqual(page.names());
    });

    it('moves a fragrance down', async () => {
      const page = await render();

      await page.click(down(page, 'Creed Aventus'));

      expect(page.names()).toEqual([
        'Xerjoff Naxos',
        'Creed Aventus',
        'Tom Ford Noir Extreme',
        'Kilian Smoking Hot',
      ]);
    });

    it('does nothing when moving past either end', async () => {
      const page = await render();

      await page.click(up(page, 'Creed Aventus'));
      await page.click(down(page, 'Kilian Smoking Hot'));

      expect(page.names()).toEqual(SAMPLE.map((f) => f.name));
    });

    it('allows dragging only in the full list and not while renaming', async () => {
      const page = await render();
      const dragDisabled = () => page.rows().map((r) => r.classList.contains('cdk-drag-disabled'));

      expect(page.rows().every((r) => r.classList.contains('cdk-drag'))).toBe(true);
      expect(page.queryAll('.frag-row__handle.cdk-drag-handle')).toHaveLength(4);
      expect(dragDisabled()).toEqual([false, false, false, false]);

      await page.search('noir');
      expect(dragDisabled()).toEqual([true]);

      await page.search('');
      await page.click(page.query('.frag-row__edit', page.row('Xerjoff Naxos')));
      expect(dragDisabled()).toEqual([true, true, true, true]);
    });

    it('moves a fragrance by drag and drop', async () => {
      const page = await render();

      page.fixture.componentInstance.onDrop({ previousIndex: 0, currentIndex: 2 } as CdkDragDrop<
        Fragrance[]
      >);
      await page.fixture.whenStable();

      expect(page.names()).toEqual([
        'Xerjoff Naxos',
        'Tom Ford Noir Extreme',
        'Creed Aventus',
        'Kilian Smoking Hot',
      ]);
    });
  });

  describe('removing', () => {
    it('removes the fragrance and saves the list', async () => {
      seed(SAMPLE);
      const page = await render();

      await page.click(page.query('.frag-row__delete', page.row('Xerjoff Naxos')));

      expect(page.names()).toEqual([
        'Creed Aventus',
        'Tom Ford Noir Extreme',
        'Kilian Smoking Hot',
      ]);
      expect(savedItems()).toEqual([SAMPLE[0], SAMPLE[2], SAMPLE[3]]);
    });
  });

  describe('renaming', () => {
    beforeEach(() => seed(SAMPLE));

    const renameInput = (page: Page) => page.query<HTMLInputElement>('.frag-row__input');

    it('opens a focused input with the current name selected', async () => {
      const page = await render();

      await page.click(page.query('.frag-row__edit', page.row('Xerjoff Naxos')));

      const input = renameInput(page);
      expect(input.value).toBe('Xerjoff Naxos');
      expect(document.activeElement).toBe(input);
      expect([input.selectionStart, input.selectionEnd]).toEqual([0, 'Xerjoff Naxos'.length]);
    });

    it('opens on double-click on the name', async () => {
      const page = await render();

      await page.dblclick(page.query('.frag-row__name', page.row('Xerjoff Naxos')));

      expect(renameInput(page).value).toBe('Xerjoff Naxos');
    });

    it('saves a trimmed name on Enter', async () => {
      const page = await render();
      await page.click(page.query('.frag-row__edit', page.row('Xerjoff Naxos')));

      await page.type(renameInput(page), '  Xerjoff Erba Pura  ');
      await page.press(renameInput(page), 'Enter');

      expect(page.exists('.frag-row__input')).toBe(false);
      expect(page.names()[1]).toBe('Xerjoff Erba Pura');
      expect(savedItems()[1]).toEqual({ ...SAMPLE[1], name: 'Xerjoff Erba Pura' });
    });

    it('saves with the Save button', async () => {
      const page = await render();
      await page.click(page.query('.frag-row__edit', page.row('Xerjoff Naxos')));

      await page.type(renameInput(page), 'Xerjoff Erba Pura');
      await page.click('.frag-row__action--save');

      expect(page.names()[1]).toBe('Xerjoff Erba Pura');
    });

    it('does not save a blank name', async () => {
      const page = await render();
      await page.click(page.query('.frag-row__edit', page.row('Xerjoff Naxos')));

      await page.type(renameInput(page), '   ');

      expect(page.query<HTMLButtonElement>('.frag-row__action--save').disabled).toBe(true);
      await page.press(renameInput(page), 'Enter');
      expect(page.exists('.frag-row__input')).toBe(true);
      expect(savedItems()[1].name).toBe('Xerjoff Naxos');
    });

    it('cancels on Escape', async () => {
      const page = await render();
      await page.click(page.query('.frag-row__edit', page.row('Xerjoff Naxos')));
      await page.type(renameInput(page), 'Something else');

      await page.press(document, 'Escape');

      expect(page.exists('.frag-row__input')).toBe(false);
      expect(page.names()[1]).toBe('Xerjoff Naxos');
    });

    it('cancels with the Cancel button', async () => {
      const page = await render();
      await page.click(page.query('.frag-row__edit', page.row('Xerjoff Naxos')));
      await page.type(renameInput(page), 'Something else');

      await page.click('.frag-row__edit-actions .frag-row__action:not(.frag-row__action--save)');

      expect(page.names()[1]).toBe('Xerjoff Naxos');
    });

    it('locks moving, removing and other renames while a rename is open', async () => {
      const page = await render();
      await page.click(page.query('.frag-row__edit', page.row('Xerjoff Naxos')));

      const locked = page.queryAll<HTMLButtonElement>(
        '.frag-row__arrow, .frag-row__edit, .frag-row__delete',
      );
      expect(locked.length).toBeGreaterThan(0);
      expect(locked.every((b) => b.disabled)).toBe(true);

      await page.dblclick(page.query('.frag-row__name', page.row('Creed Aventus')));
      expect(page.queryAll('.frag-row__input')).toHaveLength(1);
      expect(renameInput(page).value).toBe('Xerjoff Naxos');
    });
  });

  describe('search', () => {
    beforeEach(() => seed(SAMPLE));

    it('filters by name case-insensitively and keeps the real rank', async () => {
      const page = await render();

      await page.search('NOIR');

      expect(page.names()).toEqual(['Tom Ford Noir Extreme']);
      expect(page.ranks()).toEqual(['3']);
    });

    it('shows everything again when cleared', async () => {
      const page = await render();

      await page.search('noir');
      await page.search('');

      expect(page.names()).toEqual(SAMPLE.map((f) => f.name));
    });

    it('applies actions in the filtered list to the right fragrance', async () => {
      const page = await render();
      await page.search('smoking');

      await page.click(page.query('.frag-row__status', page.row('Kilian Smoking Hot')));
      await page.click(page.queryAll('.frag-row__arrow', page.row('Kilian Smoking Hot'))[0]);
      await page.search('');

      expect(page.names()).toEqual([
        'Creed Aventus',
        'Xerjoff Naxos',
        'Kilian Smoking Hot',
        'Tom Ford Noir Extreme',
      ]);
      expect(page.personal(page.row('Kilian Smoking Hot'))).toBe('✅');
      expect(page.personal(page.row('Tom Ford Noir Extreme'))).toBe('🚩');
    });

    it('renames from the filtered list', async () => {
      const page = await render();
      await page.search('naxos');

      await page.click(page.query('.frag-row__edit', page.row('Xerjoff Naxos')));
      await page.type('.frag-row__input', 'Xerjoff Erba Pura');
      await page.press('.frag-row__input', 'Enter');
      await page.search('');

      expect(page.names()[1]).toBe('Xerjoff Erba Pura');
    });

    it('removes from the filtered list', async () => {
      const page = await render();
      await page.search('noir');

      await page.click(page.query('.frag-row__delete', page.row('Tom Ford Noir Extreme')));
      await page.search('');

      expect(page.names()).toEqual(['Creed Aventus', 'Xerjoff Naxos', 'Kilian Smoking Hot']);
    });
  });

  describe('export', () => {
    beforeEach(() => seed(SAMPLE));

    it('shows the formatted list and keeps it up to date', async () => {
      const page = await render();

      expect(page.exportText()).toBe(formatList(SAMPLE));

      await page.click(page.query('.frag-row__delete', page.row('Creed Aventus')));

      expect(page.exportText()).toBe(formatList(SAMPLE.slice(1)));
    });

    it('copies the list to the clipboard and confirms for two seconds', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
      const page = await render();
      vi.useFakeTimers();

      try {
        page.query('.btn--copy').click();
        await vi.advanceTimersByTimeAsync(0);
        page.fixture.detectChanges();

        expect(writeText).toHaveBeenCalledWith(formatList(SAMPLE));
        expect(page.query('.btn--copy').textContent!.trim()).toBe('Copied ✓');

        await vi.advanceTimersByTimeAsync(2000);
        page.fixture.detectChanges();

        expect(page.query('.btn--copy').textContent!.trim()).toBe('Copy to Clipboard');
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('import', () => {
    beforeEach(() => seed(SAMPLE));

    const IMPORT_TEXT =
      '1) Amouage Outlands (✅) [Grandma: 👍]\n2) Memo African Leather (○) [Grandma: ❔]';
    const confirmButton = (page: Page) => page.query<HTMLButtonElement>('.btn--confirm');

    it('opens an empty dialog with import disabled', async () => {
      const page = await render();

      await page.click('.btn--import');

      expect(page.query<HTMLTextAreaElement>('.modal__textarea').value).toBe('');
      expect(confirmButton(page).disabled).toBe(true);
      expect(confirmButton(page).textContent!.trim()).toBe('Replace List (0 items)');
    });

    it('previews the parsed list', async () => {
      const page = await render();
      await page.click('.btn--import');

      await page.type('.modal__textarea', IMPORT_TEXT);

      expect(page.query('.modal__preview-label').textContent!.replace(/\s+/g, ' ').trim()).toBe(
        'Detected 2 fragrances',
      );
      expect(
        page
          .queryAll('.modal__preview-item')
          .map((i) => i.textContent!.replace(/\s+/g, ' ').trim()),
      ).toEqual(['1) Amouage Outlands ✅👍', '2) Memo African Leather ❔']);
      expect(confirmButton(page).disabled).toBe(false);
      expect(confirmButton(page).textContent!.trim()).toBe('Replace List (2 items)');
    });

    it('previews at most five items', async () => {
      const page = await render();
      await page.click('.btn--import');

      await page.type(
        '.modal__textarea',
        Array.from({ length: 8 }, (_, i) => `${i + 1}) Fragrance ${i + 1}`).join('\n'),
      );

      const items = page.queryAll('.modal__preview-item');
      expect(items).toHaveLength(6);
      expect(items[5].textContent!.trim()).toBe('...and 3 more');
    });

    it('keeps import disabled when nothing can be parsed', async () => {
      const page = await render();
      await page.click('.btn--import');

      await page.type('.modal__textarea', 'just some text');

      expect(page.exists('.modal__preview')).toBe(false);
      expect(confirmButton(page).disabled).toBe(true);
    });

    it('replaces the whole list on confirm', async () => {
      const page = await render();
      await page.click('.btn--import');
      await page.type('.modal__textarea', IMPORT_TEXT);

      await page.click(confirmButton(page));

      expect(page.exists('.modal')).toBe(false);
      expect(page.names()).toEqual(['Amouage Outlands', 'Memo African Leather']);
      expect(savedItems()).toEqual([
        { name: 'Amouage Outlands', status: 'enjoy', grandmaStatus: 'liked' },
        { name: 'Memo African Leather', status: null, grandmaStatus: 'unknown' },
      ]);
    });

    it.each([
      ['the Cancel button', '.btn--cancel'],
      ['the close button', '.modal__close'],
      ['a click on the backdrop', '.modal-backdrop'],
    ])('closes without changes via %s', async (_, selector) => {
      const page = await render();
      await page.click('.btn--import');
      await page.type('.modal__textarea', IMPORT_TEXT);

      await page.click(selector);

      expect(page.exists('.modal')).toBe(false);
      expect(page.names()).toEqual(SAMPLE.map((f) => f.name));
    });

    it('stays open when clicking inside the dialog', async () => {
      const page = await render();
      await page.click('.btn--import');

      await page.click('.modal__hint');

      expect(page.exists('.modal')).toBe(true);
    });

    it('starts with a clean dialog when reopened', async () => {
      const page = await render();
      await page.click('.btn--import');
      await page.type('.modal__textarea', IMPORT_TEXT);
      await page.click('.btn--cancel');

      await page.click('.btn--import');

      expect(page.query<HTMLTextAreaElement>('.modal__textarea').value).toBe('');
      expect(page.exists('.modal__preview')).toBe(false);
    });

    it('cancels an open rename', async () => {
      const page = await render();
      await page.click(page.query('.frag-row__edit', page.row('Xerjoff Naxos')));

      await page.click('.btn--import');

      expect(page.exists('.frag-row__input')).toBe(false);
    });
  });
});
