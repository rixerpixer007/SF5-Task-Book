export const STORAGE_KEYS = {
  tasks: 'sf5-task-book-v1',
  position: 'sf5-reader-position-v1',
};

// Access storage inside try/catch: private/blocked storage can throw on access,
// not only on setItem. The reader stays usable in memory in that case.
export function createReaderStorage(
  getStorage = () => globalThis.localStorage,
) {
  const read = (key) => {
    try {
      return JSON.parse(getStorage().getItem(key) || 'null');
    } catch {
      return null;
    }
  };
  const write = (key, value) => {
    try {
      getStorage().setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  };
  return {
    loadTasks(validIds) {
      const saved = read(STORAGE_KEYS.tasks);
      if (!saved || typeof saved !== 'object' || Array.isArray(saved))
        return {};
      return Object.fromEntries(
        [...validIds]
          .filter((id) => saved[id] === true)
          .map((id) => [id, true]),
      );
    },
    saveTasks(tasks) {
      return write(STORAGE_KEYS.tasks, tasks);
    },
    savePage(pages, index) {
      const page = pages[index];
      if (!page) return false;
      return write(STORAGE_KEYS.position, {
        version: 1,
        sourcePage: page.sourcePage,
        sourceOffset: pages
          .slice(0, index)
          .filter((other) => other.sourcePage === page.sourcePage).length,
        taskId: page.lines.find((line) => line.taskId)?.taskId ?? null,
      });
    },
    loadPage(pages) {
      const saved = read(STORAGE_KEYS.position);
      if (
        saved?.version !== 1 ||
        !Number.isInteger(saved.sourcePage) ||
        saved.sourcePage < 1 ||
        !Number.isInteger(saved.sourceOffset) ||
        saved.sourceOffset < 0
      )
        return 0;
      const candidates = pages.flatMap((page, index) =>
        page.sourcePage === saved.sourcePage ? [index] : [],
      );
      if (!candidates.length) return 0;
      const continuation =
        candidates[Math.min(saved.sourceOffset, candidates.length - 1)];
      const anchored =
        typeof saved.taskId === 'string'
          ? [continuation, ...candidates].find((index) =>
              pages[index].lines.some((line) => line.taskId === saved.taskId),
            )
          : undefined;
      const index = anchored ?? continuation;
      return index;
    },
  };
}
