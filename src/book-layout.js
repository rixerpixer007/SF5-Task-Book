// Checklist's GUI dimensions and flow rules, measured in Minecraft GUI pixels.
// Its two 232px book sprites have transparent margins; the visible spread is 352×220.
export const BOOK = {
  width: 352,
  height: 220,
  textWidth: 139,
  // Content paints 9px below the flow cursor; stop 2px before the controls.
  textHeight: 176,
  arrowTop: 187,
  lineHeight: 9,
  paragraphGap: 9,
  taskIndent: 20,
  checkboxSize: 18,
  fontSize: 8,
};
const colors = [
  '#000000',
  '#0000aa',
  '#00aa00',
  '#00aaaa',
  '#aa0000',
  '#aa00aa',
  '#ffaa00',
  '#aaaaaa',
  '#555555',
  '#5555ff',
  '#55ff55',
  '#55ffff',
  '#ff5555',
  '#ff55ff',
  '#ffff55',
  '#ffffff',
];

function richText(text) {
  const runs = [];
  let color,
    underlined = false;
  const append = (chunk, href) => {
    let buffer = '';
    const flush = () => {
      if (buffer)
        runs.push({
          text: buffer,
          ...(href && { href }),
          ...(color && { color }),
          ...(underlined && { underlined }),
        });
      buffer = '';
    };
    for (let i = 0; i < chunk.length; i++) {
      if (chunk[i] !== '§' || i + 1 === chunk.length) {
        buffer += chunk[i];
        continue;
      }
      flush();
      const code = chunk[++i].toLowerCase();
      if (/^[0-9a-f]$/.test(code)) {
        color = colors[parseInt(code, 16)];
        underlined = false;
      } else if (code === 'n') underlined = true;
      else if (code === 'r' || !['k', 'l', 'm', 'o'].includes(code)) {
        color = undefined;
        underlined = false;
      }
    }
    flush();
  };
  const rx = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  let last = 0;
  for (const match of text.matchAll(rx)) {
    append(text.slice(last, match.index));
    append(match[1], match[2]);
    last = match.index + match[0].length;
  }
  append(text.slice(last));
  return runs;
}

export function wrapText(text, width, measure) {
  const characters = richText(text).flatMap((run) =>
    Array.from(run.text, (char) => ({ ...run, char })),
  );
  const lines = [];
  let start = 0;
  while (start < characters.length) {
    let end = start,
      space = -1,
      lineText = '';
    while (end < characters.length && characters[end].char !== '\n') {
      const next = lineText + characters[end].char;
      if (measure(next) > width && end > start) break;
      lineText = next;
      if (characters[end].char === ' ') space = end;
      end++;
    }
    let nextStart = end;
    if (end < characters.length && characters[end].char === '\n') nextStart++;
    else if (end < characters.length && space > start) {
      end = space;
      nextStart = space + 1;
    }
    const runs = [];
    for (const { char, href, color, underlined } of characters.slice(
      start,
      end,
    )) {
      const previous = runs.at(-1);
      if (
        previous &&
        previous.href === href &&
        previous.color === color &&
        previous.underlined === underlined
      )
        previous.text += char;
      else
        runs.push({
          text: char,
          ...(href && { href }),
          ...(color && { color }),
          ...(underlined && { underlined }),
        });
    }
    lines.push(runs);
    start = nextStart;
  }
  return lines.length ? lines : [[]];
}

export function parseBookSource(source, sections) {
  const tasks = new Map(
    sections.flatMap((section) =>
      section.entries
        .filter((entry) => entry.task)
        .map((entry) => [`${entry.page}:${entry.text}`, entry.id]),
    ),
  );
  return source.split(/^===$/m).map((chunk, index) => {
    const sourcePage = index + 1;
    let chapter = 0;
    sections.forEach((section, i) => {
      if (section.page <= sourcePage) chapter = i;
    });
    const entries = chunk
      .split(/\r?\n/)
      .filter((line) => line.trim())
      .map((line) => {
        const text = line.replace(/^#/, '').trim().replace(/\\n/g, '\n');
        const clean = text.replace(/§./g, '');
        const taskId = tasks.get(`${sourcePage}:${clean}`);
        return {
          text,
          taskId,
          divider: /^=+$/.test(clean),
          heading:
            line.startsWith('#') &&
            (clean.replace(/^[\s=\-]+|[\s=\-]+$/g, '') ===
              sections[chapter].title ||
              /^--==|^-=/.test(clean)),
        };
      });
    return { sourcePage, chapter, entries };
  });
}

export function paginateBook(sourcePages, measure) {
  const pages = [];
  for (const source of sourcePages) {
    let page, offset;
    const newPage = () => {
      page = {
        chapter: source.chapter,
        sourcePage: source.sourcePage,
        lines: [],
      };
      pages.push(page);
      offset = 10;
    };
    newPage(); // Explicit page breaks, including blank hidden pages, are preserved.
    for (const entry of source.entries) {
      // A decorative rule is one graphic line, not a paragraph to word-wrap.
      const lines = entry.divider
        ? [richText(entry.text)]
        : wrapText(
            entry.text,
            BOOK.textWidth - (entry.taskId ? BOOK.taskIndent : 0),
            measure,
          );
      const textHeight = lines.length * BOOK.lineHeight;
      // A task occupies its entire checkbox as well as its text, including when
      // the label has only one line. Measure and render with the same font metrics.
      const height = entry.taskId
        ? Math.max(textHeight, BOOK.checkboxSize)
        : textHeight;
      if (offset + height > BOOK.textHeight && page.lines.length) newPage();
      const blockTop = offset + BOOK.lineHeight;
      const y = Math.floor(blockTop + (height - textHeight) / 2);
      const checkboxY = Math.floor(blockTop + (height - BOOK.checkboxSize) / 2);
      lines.forEach((runs, index) =>
        page.lines.push({
          runs,
          y: y + index * BOOK.lineHeight,
          width: entry.divider
            ? BOOK.textWidth
            : measure(runs.map((run) => run.text).join('')),
          divider: entry.divider,
          taskId: entry.taskId,
          taskStart: !!entry.taskId && index === 0,
          checkboxOffset: checkboxY - y,
          blockTop,
          blockHeight: height,
          heading: entry.heading,
        }),
      );
      offset += height + BOOK.paragraphGap;
    }
  }
  return pages;
}
