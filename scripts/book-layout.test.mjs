import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  BOOK,
  paginateBook,
  parseBookSource,
  wrapText,
} from '../src/book-layout.js';

const plain = (text) =>
  text.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1').replace(/\s/g, '');
const lineText = (line) => line.map((run) => run.text).join('');
// Deliberately use wider glyphs than the actual font to exercise overflow paths.
const measure = (text) => text.length * 7;

test('wrapping preserves words, explicit newlines, and oversized unbroken text', () => {
  for (const text of [
    'A short line',
    'one two\nthree four',
    'a'.repeat(100),
    'a\n\nb',
    'https://example.com/long-unbroken-path',
  ]) {
    const lines = wrapText(text, 40, measure);
    assert.equal(plain(lines.map(lineText).join('')), plain(text));
    assert.ok(lines.every((line) => measure(lineText(line)) <= 40));
  }
});

test('links retain their URL when wrapped across lines', () => {
  const lines = wrapText(
    'Visit [the official website](https://example.com) today',
    50,
    measure,
  );
  const linked = lines.flat().filter((run) => run.href);
  assert.equal(
    linked
      .map((run) => run.text)
      .join('')
      .replace(/\s/g, ''),
    'theofficialwebsite',
  );
  assert.ok(linked.every((run) => run.href === 'https://example.com'));
});

test('source formatting and every explicit page break are retained', async () => {
  const sections = JSON.parse(
    await readFile(new URL('../src/data/book.json', import.meta.url), 'utf8'),
  );
  const source = await readFile(
    new URL('../src/data/book-source.txt', import.meta.url),
    'utf8',
  );
  const originals = await readFile(
    new URL('../reference/tasks.txt', import.meta.url),
    'utf8',
  );
  assert.equal(source, originals);
  const parsed = parseBookSource(source, sections);
  assert.equal(parsed.length, 93);
  assert.ok(parsed.some((page) => !page.entries.length));
  assert.ok(parsed[0].entries.some((entry) => entry.text.includes('§1===')));
  const tasks = parsed
    .flatMap((page) => page.entries)
    .filter((entry) => entry.taskId);
  assert.deepEqual(
    tasks.map((entry) => entry.taskId),
    Array.from({ length: 194 }, (_, i) => `t${i + 1}`),
  );
  const pages = paginateBook(parsed, (text) => text.length * 4.5);
  for (const page of pages) {
    for (const line of page.lines) {
      assert.ok(line.y >= 0 && line.y + BOOK.lineHeight <= 200);
      assert.ok(
        line.width <= BOOK.textWidth - (line.taskId ? BOOK.taskIndent : 0),
      );
    }
  }
  for (const sourcePage of parsed)
    assert.ok(pages.some((page) => page.sourcePage === sourcePage.sourcePage));
  for (const task of tasks) {
    const containing = pages.filter((page) =>
      page.lines.some((line) => line.taskId === task.taskId),
    );
    assert.equal(containing.length, 1, 'A task must not be split across pages');
    const lines = containing[0].lines.filter(
      (line) => line.taskId === task.taskId,
    );
    assert.equal(lines.filter((line) => line.taskStart).length, 1);
    assert.equal(
      plain(lines.map((line) => lineText(line.runs)).join('')),
      plain(task.text.replace(/§./g, '')),
    );
  }
});

test('heading decorations retain source colors without changing their wording', () => {
  const runs = wrapText(
    '§1--==§0Stone Age§1==--',
    139,
    (text) => text.length * 4,
  )[0];
  assert.equal(lineText(runs), '--==Stone Age==--');
  assert.equal(runs[0].color, '#0000aa');
  assert.equal(runs[1].color, '#000000');
  assert.equal(runs[2].color, '#0000aa');
});

test('single-line and multiline task boxes reserve their full height and a consistent gap', () => {
  const entries = [
    { text: 'First', taskId: 't1' },
    { text: 'Second', taskId: 't2' },
    { text: 'A longer label that wraps over multiple lines', taskId: 't3' },
    { text: 'Last', taskId: 't4' },
  ];
  const pages = paginateBook(
    [{ sourcePage: 1, chapter: 0, entries }],
    (text) => text.length * 6,
  );
  const starts = pages[0].lines.filter((line) => line.taskStart);
  assert.equal(starts.length, 4);
  assert.equal(starts[0].blockHeight, BOOK.checkboxSize);
  assert.equal(starts[1].blockHeight, BOOK.checkboxSize);
  assert.ok(starts[2].blockHeight > BOOK.checkboxSize);
  for (let i = 1; i < starts.length; i++) {
    assert.equal(
      starts[i].blockTop - starts[i - 1].blockTop - starts[i - 1].blockHeight,
      BOOK.paragraphGap,
    );
    const previousBottom =
      starts[i - 1].y + starts[i - 1].checkboxOffset + BOOK.checkboxSize;
    const nextTop = starts[i].y + starts[i].checkboxOffset;
    assert.ok(nextTop - previousBottom >= BOOK.paragraphGap - 1);
  }
});

test('pagination accounts for checkbox footprints instead of packing by text alone', () => {
  const entries = Array.from({ length: 8 }, (_, i) => ({
    text: `Task ${i + 1}`,
    taskId: `t${i + 1}`,
  }));
  const pages = paginateBook(
    [{ sourcePage: 1, chapter: 0, entries }],
    (text) => text.length * 5,
  );
  assert.equal(pages.length, 2);
  assert.equal(pages[0].lines.filter((line) => line.taskStart).length, 6);
  assert.equal(pages[1].lines.filter((line) => line.taskStart).length, 2);
  for (const page of pages)
    for (const line of page.lines) {
      assert.ok(line.blockTop + line.blockHeight <= BOOK.arrowTop - 2);
    }
});
