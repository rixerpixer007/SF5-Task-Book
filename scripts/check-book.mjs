import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const sections = JSON.parse(await read('../src/data/book.json'));
const source = await read('../reference/tasks.txt');
assert.equal(
  await read('../src/data/book-source.txt'),
  source,
  'Original book source must match the untouched reference',
);
const tasks = sections
  .flatMap((section) => section.entries)
  .filter((entry) => entry.task);
const originalTasks = source.split(/^===$/m).flatMap((page, index) =>
  index < 5
    ? []
    : page
        .split(/\r?\n/)
        .filter((line) => line.trim() && !line.startsWith('#'))
        .map((line) => line.replace(/§./g, '').trim()),
);
assert.equal(
  sections.length,
  31,
  'Expected all original chapters, including hidden pages',
);
assert.equal(tasks.length, 194, 'Expected all original tasks');
assert.deepEqual(
  tasks.map((entry) => entry.text),
  originalTasks,
  'Task wording and order must match the source',
);
assert.equal(
  new Set(tasks.map((entry) => entry.id)).size,
  tasks.length,
  'Checklist IDs must be unique',
);
assert.deepEqual(
  tasks.map((entry) => entry.id),
  tasks.map((_, i) => `t${i + 1}`),
  'Keep checklist IDs stable for saved progress',
);
for (const section of sections) {
  assert.ok(section.title && Number.isInteger(section.page));
  for (const entry of section.entries) {
    assert.equal(typeof entry.text, 'string');
    assert.ok(entry.text.length > 0);
    assert.ok(Number.isInteger(entry.page));
  }
}
console.log(
  `Book verified: ${sections.length} chapters, ${tasks.length} tasks; wording, order, and saved-progress IDs preserved.`,
);
