import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createReaderStorage, STORAGE_KEYS } from '../src/reader-storage.js';
const memory = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
};
const samplePages = [
  { sourcePage: 1, lines: [] },
  { sourcePage: 2, lines: [] },
  { sourcePage: 3, lines: [{ taskId: 't1' }] },
  { sourcePage: 3, lines: [{ taskId: 't2' }] },
  { sourcePage: 4, lines: [] },
  { sourcePage: 5, lines: [] },
];

test('existing checklist data survives a new storage instance with stable task IDs', () => {
  const storage = memory();
  storage.setItem(
    STORAGE_KEYS.tasks,
    JSON.stringify({ t1: true, t2: false, t3: 'yes', t999: true }),
  );
  const state = createReaderStorage(() => storage);
  assert.deepEqual(state.loadTasks(['t1', 't2', 't3']), { t1: true });
  state.saveTasks({ t1: true, t2: true });
  assert.deepEqual(createReaderStorage(() => storage).loadTasks(['t1', 't2']), {
    t1: true,
    t2: true,
  });
});
test('restores every individual page, including right-hand and blank pages', () => {
  const storage = memory();
  const state = createReaderStorage(() => storage);
  for (const index of [0, 1, 2, 3, 4, 5]) {
    state.savePage(samplePages, index);
    assert.equal(
      createReaderStorage(() => storage).loadPage(samplePages),
      index,
    );
  }
});
test('tracks the saved task through a later pagination change', () => {
  const storage = memory();
  const state = createReaderStorage(() => storage);
  state.savePage(samplePages, 2);
  const changed = [
    samplePages[0],
    samplePages[1],
    { sourcePage: 3, lines: [] },
    { sourcePage: 3, lines: [] },
    samplePages[2],
    samplePages[3],
  ];
  assert.equal(state.loadPage(changed), 4);
});
test('restores a task continuation without jumping to its previous page', () => {
  const storage = memory();
  const state = createReaderStorage(() => storage);
  const pages = [
    { sourcePage: 1, lines: [{ taskId: 'long-task' }] },
    { sourcePage: 1, lines: [{ taskId: 'long-task' }] },
  ];
  state.savePage(pages, 1);
  assert.equal(createReaderStorage(() => storage).loadPage(pages), 1);
});
test('clamps a source continuation after reflow and ignores malformed state', () => {
  const storage = memory();
  const state = createReaderStorage(() => storage);
  storage.setItem(
    STORAGE_KEYS.position,
    JSON.stringify({
      version: 1,
      sourcePage: 3,
      sourceOffset: 999,
      taskId: 'missing',
    }),
  );
  assert.equal(state.loadPage(samplePages), 3);
  for (const raw of [
    'oops',
    'null',
    '[]',
    '{"version":2}',
    '{"version":1,"sourcePage":-1,"sourceOffset":0}',
    '{"version":1,"sourcePage":999,"sourceOffset":0}',
  ]) {
    storage.setItem(STORAGE_KEYS.position, raw);
    assert.equal(state.loadPage(samplePages), 0);
  }
  storage.setItem(STORAGE_KEYS.tasks, 'not-json');
  assert.deepEqual(state.loadTasks(['t1']), {});
});
test('blocked storage and quota failures never break reading', () => {
  const blocked = createReaderStorage(() => {
    throw new Error('blocked');
  });
  assert.deepEqual(blocked.loadTasks(['t1']), {});
  assert.equal(blocked.loadPage(samplePages), 0);
  assert.equal(blocked.saveTasks({ t1: true }), false);
  assert.equal(blocked.savePage(samplePages, 1), false);
  const quota = createReaderStorage(() => ({
    getItem: () => null,
    setItem: () => {
      throw new Error('quota');
    },
  }));
  assert.equal(quota.saveTasks({ t1: true }), false);
});
