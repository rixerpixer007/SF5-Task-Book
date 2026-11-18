import './styles.css';
import './background.css';
import sections from './data/book.json';
import bookSource from './data/book-source.txt?raw';
import { BOOK, paginateBook, parseBookSource } from './book-layout.js';
import { searchPage, nextSearchPage } from './book-search.js';
import { createReaderStorage } from './reader-storage.js';
import { createSidebarMotion } from './sidebar-motion.js';

const $ = (id) => document.getElementById(id);
document
  .querySelector('.minecraft-book')
  .style.setProperty('--page-arrow-top', `${BOOK.arrowTop}px`);
const tasks = sections
  .flatMap((section) => section.entries)
  .filter((entry) => entry.task);
const tasksById = new Map(tasks.map((entry) => [entry.id, entry]));
const readerStorage = createReaderStorage();
const done = readerStorage.loadTasks(tasksById.keys());
let pages = [],
  matches = [],
  currentPage = 0;
const singlePage = window.matchMedia(
  '(max-width: 700px), (max-width: 1000px) and (max-height: 500px)',
);
const pagesPerView = () => (singlePage.matches ? 1 : 2);
const firstVisiblePage = () => currentPage - (currentPage % pagesPerView());
document.body.classList.toggle('single-page', singlePage.matches);
const totalTasks = tasks.length;

function renderPage(page, index) {
  const leaf = document.createElement('section');
  leaf.className = 'book-page';
  if (!page) {
    leaf.setAttribute('aria-label', 'Blank page');
    return leaf;
  }
  leaf.setAttribute(
    'aria-label',
    `Page ${index + 1}: ${sections[page.chapter].title}`,
  );
  leaf.dataset.page = index;
  leaf.dataset.sourcePage = page.sourcePage;
  const counter = document.createElement('div');
  counter.className = 'page-number';
  counter.textContent = `${index + 1} of ${pages.length}`;
  leaf.append(counter);
  const content = document.createElement('div');
  content.className = 'page-content';
  const highlighted = searchPage(page, $('search').value);
  for (const [lineIndex, line] of page.lines.entries()) {
    const row = document.createElement('div');
    row.className = 'book-line';
    row.style.top = `${line.y}px`;
    if (line.heading) row.classList.add('book-heading');
    if (line.divider) {
      row.classList.add('book-divider');
      row.style.color = line.runs[0]?.color || '#0000aa';
    }
    if (line.taskId) {
      row.classList.add('task-line');
      row.dataset.taskId = line.taskId;
    }
    if (line.taskStart) {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.style.top = `${line.checkboxOffset}px`;
      checkbox.checked = !!done[line.taskId];
      checkbox.setAttribute('aria-label', tasksById.get(line.taskId).text);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) done[line.taskId] = true;
        else delete done[line.taskId];
        readerStorage.saveTasks(done);
        updateStatus();
      });
      row.append(checkbox);
    }
    const text = document.createElement('span');
    text.className = 'line-text';
    text.style.width = `${line.width}px`;
    const ink = document.createElement('span');
    ink.className = 'line-ink';
    for (const run of highlighted.lines[lineIndex]) {
      const el = document.createElement(run.href ? 'a' : 'span');
      if (run.color) el.style.color = run.color;
      if (run.underlined) el.style.textDecoration = 'underline';
      for (const part of run.parts) {
        if (part.match) {
          const mark = document.createElement('mark');
          mark.className = 'search-hit';
          mark.textContent = part.text;
          el.append(mark);
        } else el.append(document.createTextNode(part.text));
      }
      if (run.href) {
        el.href = run.href;
        el.target = '_blank';
        el.rel = 'noopener';
      }
      ink.append(el);
    }
    text.append(ink);
    row.append(text);
    content.append(row);
  }
  leaf.append(content);
  return leaf;
}

function updateStatus() {
  const count = tasks.filter((entry) => done[entry.id]).length;
  $('status').textContent = `${count} / ${totalTasks} completed`;
}

function updateSearchNavigation() {
  const searching = !!$('search').value.trim();
  $('search-results').hidden = !searching;
  const visible = matches.flatMap((page, index) =>
    page >= firstVisiblePage() && page < firstVisiblePage() + pagesPerView()
      ? [index + 1]
      : [],
  );
  const position = visible.length
    ? `${visible[0]}${visible.length > 1 ? `–${visible.at(-1)}` : ''} / `
    : '';
  const suffix = document.createElement('span');
  suffix.className = 'search-count-label';
  suffix.textContent = ` matching ${matches.length === 1 ? 'page' : 'pages'}`;
  const count = `${position}${matches.length}`;
  $('search-count').replaceChildren(document.createTextNode(count), suffix);
  $('search-count').setAttribute('aria-label', count + suffix.textContent);
  const canNavigate = matches.some(
    (page) =>
      page < firstVisiblePage() || page >= firstVisiblePage() + pagesPerView(),
  );
  $('search-previous').disabled = !canNavigate;
  $('search-next').disabled = !canNavigate;
}
function navigateSearch(direction) {
  const next = nextSearchPage(
    matches,
    firstVisiblePage(),
    direction,
    pagesPerView(),
  );
  if (next !== undefined) goToPage(next);
}

function revealActiveChapter() {
  const nav = $('nav');
  const active = nav.querySelector('[aria-current="page"]');
  if (
    !sidebarOpen ||
    $('chapters-panel').hidden ||
    !active ||
    !nav.clientHeight
  )
    return;

  // Scroll only the chapter list, never its ancestors or the book.
  const bounds = nav.getBoundingClientRect();
  const item = active.getBoundingClientRect();
  const top = bounds.top + nav.clientTop;
  const bottom = top + nav.clientHeight;
  if (item.top < top || item.height > nav.clientHeight) {
    nav.scrollTop += item.top - top;
  } else if (item.bottom > bottom) {
    nav.scrollTop += item.bottom - bottom;
  }
}

function render() {
  const left = firstVisiblePage();
  const count = pagesPerView();
  $('leaves').replaceChildren(
    ...Array.from({ length: count }, (_, offset) =>
      renderPage(pages[left + offset], left + offset),
    ),
  );
  $('previous').disabled = left === 0;
  $('next').disabled = left + count >= pages.length;
  $('previous').setAttribute(
    'aria-label',
    count === 1 ? 'Previous page' : 'Previous two pages',
  );
  $('next').setAttribute(
    'aria-label',
    count === 1 ? 'Next page' : 'Next two pages',
  );
  $('search').placeholder = singlePage.matches
    ? 'Search task book…'
    : 'Search tasks, mods, or chapters…';
  $('book').setAttribute(
    'aria-label',
    `Task book, ${count === 1 ? `page ${left + 1}` : `pages ${left + 1}–${Math.min(left + 2, pages.length)}`} of ${pages.length}. Use left and right arrow keys to turn pages.`,
  );
  document.querySelectorAll('#nav a').forEach((link, index) => {
    if (index === pages[left].chapter)
      link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  updateSearchNavigation();
  revealActiveChapter();
  readerStorage.savePage(pages, currentPage);
}
function goToPage(index) {
  if (!pages.length || !Number.isInteger(index) || index < 0) return;
  currentPage = Math.min(index, pages.length - 1);
  render();
}
function goToChapter(chapter) {
  if (!pages.length) return;
  $('search').value = '';
  matches = [];
  goToPage(pages.findIndex((page) => page.chapter === chapter));
  updateStatus();
  if (narrowSidebar.matches) setSidebarOpen(false);
}
sections.forEach((section, index) => {
  const link = document.createElement('a');
  link.href = `#chapter-${index}`;
  link.textContent = section.title;
  link.addEventListener('click', (event) => {
    event.preventDefault();
    goToChapter(index);
  });
  $('nav').append(link);
});
$('previous').addEventListener('click', () => {
  if (firstVisiblePage() > 0) goToPage(firstVisiblePage() - pagesPerView());
});
$('next').addEventListener('click', () => {
  if (firstVisiblePage() + pagesPerView() < pages.length)
    goToPage(firstVisiblePage() + pagesPerView());
});
document.addEventListener('keydown', (event) => {
  if (
    event.defaultPrevented ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.isComposing ||
    event.target.isContentEditable ||
    event.target.closest(
      'input:not([type="checkbox"]), textarea, select, [contenteditable]:not([contenteditable="false"])',
    )
  )
    return;
  // Check the produced character so layouts that use Shift for / also work.
  if (event.key === '/') {
    event.preventDefault();
    $('search').focus({ preventScroll: true });
    return;
  }
  if (event.shiftKey || !pages.length) return;
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault();
    // Page navigation leaves the chapter link so its focus state cannot look active.
    if (event.target.closest('#nav')) $('book').focus({ preventScroll: true });
    $(event.key === 'ArrowRight' ? 'next' : 'previous').click();
  }
});
$('book').addEventListener('keydown', (event) => {
  if (event.target.matches('input, a')) return;
  if (event.key === 'Home' || event.key === 'End') {
    event.preventDefault();
    goToPage(event.key === 'Home' ? 0 : pages.length - 1);
  }
});
function findPages() {
  if (!pages.length) return;
  const query = $('search').value.trim().toLowerCase();
  matches = query
    ? pages.flatMap((page, index) =>
        searchPage(page, query).count ? [index] : [],
      )
    : [];
  if (matches.length) goToPage(matches[0]);
  else render();
  updateStatus();
}
$('search').addEventListener('input', findPages);
$('search').addEventListener('keydown', (event) => {
  if (
    event.key !== 'Enter' ||
    event.isComposing ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey
  )
    return;
  event.preventDefault();
  navigateSearch(event.shiftKey ? -1 : 1);
});
$('search-previous').addEventListener('click', () => navigateSearch(-1));
$('search-next').addEventListener('click', () => navigateSearch(1));
const narrowSidebar = window.matchMedia('(max-width: 1000px)');
let sidebarOpen = !narrowSidebar.matches;
const sidebarMotion = createSidebarMotion($('chapters-panel'));
function setSidebarOpen(
  open,
  { animate = document.body.classList.contains('motion-ready') } = {},
) {
  sidebarOpen = open;
  if (!open && $('chapters-panel').contains(document.activeElement))
    $('sidebar-toggle').focus({ preventScroll: true });
  sidebarMotion.setVisible(open, { animate });
  document.body.classList.toggle('sidebar-collapsed', !open);
  $('sidebar-toggle').setAttribute('aria-expanded', String(open));
  const label = open ? 'Hide chapters' : 'Show chapters';
  $('sidebar-toggle').setAttribute('aria-label', label);
  $('sidebar-toggle').title = label;
  $('sidebar-backdrop').hidden = !open || !narrowSidebar.matches;
  reader.inert = footer.inert = open && narrowSidebar.matches;
  scheduleBookFit();
}
$('sidebar-toggle').addEventListener('click', () =>
  setSidebarOpen(!sidebarOpen),
);
$('sidebar-backdrop').addEventListener('click', () => setSidebarOpen(false));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && sidebarOpen) setSidebarOpen(false);
});
narrowSidebar.addEventListener('change', () =>
  setSidebarOpen(!narrowSidebar.matches, { animate: false }),
);

singlePage.addEventListener('change', () => {
  document.body.classList.toggle('single-page', singlePage.matches);
  if (pages.length) render();
  scheduleBookFit();
});

// Fit the whole spread in the space left by the controls, footer, and padding.
// Only the canvas scale changes; its text wrapping and pagination stay fixed.
const reader = document.querySelector('.reader');
const tools = document.querySelector('.tools');
const footer = document.querySelector('.foot');
function fitBook() {
  const style = getComputedStyle(reader);
  const horizontalPadding =
    parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  const verticalPadding =
    parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  const controlsHeight =
    tools.getBoundingClientRect().height +
    parseFloat(getComputedStyle(tools).marginBottom);
  const availableWidth = reader.clientWidth - horizontalPadding;
  const availableHeight = Math.max(
    1,
    (window.visualViewport?.height ?? window.innerHeight) -
      verticalPadding -
      controlsHeight -
      footer.getBoundingClientRect().height -
      2,
  );
  const canvasWidth = singlePage.matches ? BOOK.width / 2 : BOOK.width;
  // Phones use the page width for readable type, even with a short viewport or keyboard.
  const width = Math.max(
    1,
    Math.floor(
      singlePage.matches
        ? Math.min(availableWidth, 440)
        : Math.min(
            availableWidth,
            (availableHeight * canvasWidth) / BOOK.height,
          ),
    ),
  );
  reader.style.setProperty('--reader-book-width', `${width}px`);
  $('book').style.setProperty('--book-scale', width / canvasWidth);
  $('book').style.height = `${(BOOK.height * width) / canvasWidth}px`;
}
let fitFrame;
function scheduleBookFit() {
  cancelAnimationFrame(fitFrame);
  fitFrame = requestAnimationFrame(() => {
    fitBook();
    revealActiveChapter();
  });
}
const observer = new ResizeObserver(scheduleBookFit);
[reader, tools, footer, $('nav')].forEach((element) =>
  observer.observe(element),
);
window.addEventListener('resize', scheduleBookFit);
window.visualViewport?.addEventListener('resize', scheduleBookFit);
setSidebarOpen(sidebarOpen);
fitBook();
try {
  await document.fonts.load(`${BOOK.fontSize}px Minecraft`);
} catch {
  /* The CSS and canvas share the same monospace fallback if the font is unavailable. */
}
const canvas = document.createElement('canvas');
const context = canvas.getContext('2d');
context.font = `${BOOK.fontSize}px Minecraft`;
context.fontKerning = 'none';
pages = paginateBook(
  parseBookSource(bookSource, sections),
  (text) => context.measureText(text).width,
);
currentPage = readerStorage.loadPage(pages);
$('book').setAttribute('aria-busy', 'false');
if ($('search').value.trim()) findPages();
else render();
updateStatus();
