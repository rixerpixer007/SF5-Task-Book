// Search the text actually printed on a page. Keep offsets across wrapped lines
// so a phrase can be highlighted on both sides of a line break or link boundary.
export function searchPage(page, query) {
  const text = page.lines
    .map((line) => line.runs.map((run) => run.text).join(''))
    .join(' ');
  const needle = query.trim();
  const ranges = needle
    ? Array.from(
        text.matchAll(
          new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'giu'),
        ),
        (match) => ({ start: match.index, end: match.index + match[0].length }),
      )
    : [];
  let offset = 0;
  const lines = page.lines.map((line) => {
    const runs = line.runs.map((run) => {
      const end = offset + run.text.length;
      const parts = [];
      let cursor = offset;
      for (const range of ranges) {
        const start = Math.max(offset, range.start);
        const stop = Math.min(end, range.end);
        if (stop <= start) continue;
        if (start > cursor)
          parts.push({
            text: run.text.slice(cursor - offset, start - offset),
            match: false,
          });
        parts.push({
          text: run.text.slice(start - offset, stop - offset),
          match: true,
        });
        cursor = stop;
      }
      if (cursor < end)
        parts.push({ text: run.text.slice(cursor - offset), match: false });
      offset = end;
      return { ...run, parts };
    });
    offset++; // The space used to join wrapped lines above.
    return runs;
  });
  return { count: ranges.length, lines };
}

// Skip matches already visible, whether reading one page or a spread.
export function nextSearchPage(
  matches,
  firstPage,
  direction,
  visiblePages = 2,
) {
  if (!matches.length) return undefined;
  return direction > 0
    ? (matches.find((page) => page >= firstPage + visiblePages) ?? matches[0])
    : (matches.findLast((page) => page < firstPage) ?? matches.at(-1));
}
