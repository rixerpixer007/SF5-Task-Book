import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchPage, nextSearchPage } from '../src/book-search.js';
const page = (...lines) => ({
  lines: lines.map((line) => ({
    runs: typeof line === 'string' ? [{ text: line }] : line,
  })),
});
const hits = (result) =>
  result.lines
    .flat(2)
    .flatMap((run) =>
      run.parts.filter((part) => part.match).map((part) => part.text),
    );

test('highlights every occurrence case-insensitively without changing printed text', () => {
  const result = searchPage(page('Craft a crafting table'), 'craft');
  assert.equal(result.count, 2);
  assert.deepEqual(hits(result), ['Craft', 'craft']);
  assert.equal(
    result.lines[0]
      .flatMap((run) => run.parts.map((part) => part.text))
      .join(''),
    'Craft a crafting table',
  );
});
test('highlights a phrase across wrapped lines and link boundaries', () => {
  const href = 'https://example.com';
  const result = searchPage(
    page('Make a Crafting', [{ text: 'Table', href }, { text: ' today' }]),
    'crafting table',
  );
  assert.equal(result.count, 1);
  assert.deepEqual(hits(result), ['Crafting', 'Table']);
  assert.equal(result.lines[1][0].href, href);
  assert.deepEqual(
    hits(
      searchPage(
        page([{ text: 'Sky' }, { text: 'Factory', href }]),
        'skyfactory',
      ),
    ),
    ['Sky', 'Factory'],
  );
});
test('handles punctuation literally and preserves Unicode offsets', () => {
  assert.deepEqual(hits(searchPage(page('Use [a+b] and not aab'), '[a+b]')), [
    '[a+b]',
  ]);
  assert.deepEqual(hits(searchPage(page('® SkyFactory'), 'sky')), ['Sky']);
});
test('cleared, blank, and unmatched searches have no stale highlights', () => {
  for (const query of ['', '   ', 'no such text']) {
    const result = searchPage(page('Crafting Table'), query);
    assert.equal(result.count, 0);
    assert.deepEqual(hits(result), []);
    assert.equal(result.lines[0][0].parts[0].text, 'Crafting Table');
  }
});
test('matches only visible content, not a hidden chapter title', () => {
  const continuation = { ...page('Make an item'), chapter: 2 };
  assert.equal(searchPage(continuation, 'Mob Spawning').count, 0);
});

test('result navigation moves by spread in both directions and wraps', () => {
  const matches = [0, 1, 4, 9];
  assert.equal(nextSearchPage(matches, 0, 1), 4);
  assert.equal(nextSearchPage(matches, 4, 1), 9);
  assert.equal(nextSearchPage(matches, 8, 1), 0);
  assert.equal(nextSearchPage(matches, 0, -1), 9);
  assert.equal(nextSearchPage(matches, 8, -1), 4);
  assert.equal(nextSearchPage(matches, 4, -1), 1);
  assert.equal(nextSearchPage([], 0, 1), undefined);
  assert.equal(nextSearchPage([], 0, -1), undefined);
});

test('single-page search visits adjacent matching pages and wraps both ways', () => {
  const matches = [0, 1, 4, 9];
  assert.equal(nextSearchPage(matches, 0, 1, 1), 1);
  assert.equal(nextSearchPage(matches, 1, -1, 1), 0);
  assert.equal(nextSearchPage(matches, 9, 1, 1), 0);
  assert.equal(nextSearchPage(matches, 0, -1, 1), 9);
  assert.equal(nextSearchPage([], 0, 1, 1), undefined);
});
