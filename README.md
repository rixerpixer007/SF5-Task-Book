# SkyFactory 5 Task Book

A standalone task-book viewer that combines Minecraft's book-reading experience with navigation and document tools inspired by macOS Preview. The reader displays a Minecraft-style two-page book; the original prototype is preserved under `reference/`.

## Development

Use Node.js 22.12+ (Node 24 LTS recommended) and npm. The setup was verified with Node 26.10.0.

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:5173**. Keep the command running while developing. CSS updates apply live; JavaScript, HTML, and book-data edits refresh the page. Stop with Ctrl+C. The port is fixed: if it's occupied, stop the existing server before starting another.

```sh
npm run check        # Syntax, layout/search/storage tests, book integrity, and formatting
npm run format       # Format project files
npm run build        # Checks and production output in dist/
npm run preview      # Serve the production build at http://127.0.0.1:4173
```

Vite provides the development server and production build; the viewer uses plain JavaScript and CSS. No backend, credentials, or environment variables are required. The editor settings recommend Prettier and enable formatting on save.

## Files

- `index.html` — page shell and toolbar.
- `src/main.js` — rendering, chapter navigation, search, and reader controls.
- `src/reader-storage.js` — guarded checklist persistence and source-anchored reading position.
- `src/sidebar-motion.js` — interruptible sidebar motion with reduced-motion support.
- `src/styles.css` — viewer styling and responsive rules.
- `src/book-layout.js` — measured text wrapping and pagination at fixed Minecraft GUI dimensions.
- `src/assets/minecraft/` — local UI textures, pixel font, and attribution.
- `src/assets/checklist/` — original book/arrow and green-checkmark sprite sheets, with attribution.
- `src/data/book-source.txt` — full original text, including formatting and explicit blank pages.
- `src/book-search.js` — case-insensitive highlighting and matching-page navigation.
- `src/data/book.json` — 31 chapters, including the introduction and hidden pages, with 194 tasks.
- `src/data/source.json` — pack version, pinned upstream commit, attribution, and source URL.
- `reference/tasks.txt` — untouched upstream task-book text, including Minecraft formatting and page separators.
- `reference/SkyFactory-5-Task-Book.html` — untouched offline prototype; can still be opened directly without a server.
- `reference/SkyFactory-5-Task-Book.md` — original readable text export.
- `public/` — third-party credits and the font license, copied into production builds.
- `scripts/check-book.mjs` — verifies task wording, ordering, counts, and stable checklist IDs against the original text.

Edit the files under `src/` for the new viewer. Keep `reference/` as the migration baseline. The viewer imports `book-source.txt` for page content and formatting, with stable task IDs and sidebar titles mapped from `book.json`; no files from the previous thread's scratch folder are needed. Generated builds and dependencies are ignored by Git.

## Saved progress

Checked tasks save immediately using the original `sf5-task-book-v1` localStorage key and stable task IDs, preserving existing progress. The current page saves after every page, chapter, or search-result navigation using `sf5-reader-position-v1`. Reloading, opening another tab, or reopening the browser restores both. Reading position records the source page, continuation offset, and first task where available, so it can follow later pagination adjustments. Search text is not saved.

Storage belongs to the same browser profile and origin: the original file, localhost, 127.0.0.1, and a published domain have separate storage. Clearing site data clears saved progress; private browsing may discard it when the session closes. Existing file-based checkmarks are not automatically transferred, and progress does not sync with Minecraft. If storage is blocked, full, or malformed, the reader remains usable; changes stay in memory for that session.

## Publishing

The public reader is hosted at **https://rixerpixer007.github.io/SF5-Task-Book/**.

The workflow in `.github/workflows/deploy.yml` builds and deploys the site on every push to `main`. It can also be run manually from the repository's **Actions** tab. GitHub **Settings → Pages → Source** must be set to **GitHub Actions**. The workflow uses the Pages base path so assets load correctly under the repository URL; only the built `dist/` contents are published.

Run `npm ci` and `npm run build`, then upload the complete contents of `dist/` to a static host. The relative asset paths support a domain root or a subdirectory. Include `credits.txt` and `licenses/` from the build alongside the HTML and assets. No server-side application or secrets are needed.

Use `npm run preview` for a local production smoke check. Source/build checks and live-browser checks provide separate evidence; a successful build alone does not verify rendering or browser persistence. Keep the published origin stable so returning readers keep access to their browser-local progress.

## Content and attribution

The original text belongs to Darkosto and the SkyFactory 5 team. This is an unofficial viewer. The imported snapshot is pack version **5.0.8**, retrieved **11 November 2026**, pinned to commit `aae443225cfb87da6ba1848030d89ee2423ccc9a`.

[Original task-book source](https://github.com/DarkPacks/SkyFactory-5/blob/aae443225cfb87da6ba1848030d89ee2423ccc9a/src/minecraft/config/checklist/tasks.txt). The working reader preserves the original wording, formatting colors, decorated headings, explicit page breaks, and blank hidden pages. The book uses the Java Checklist layout; the pixel font is an OFL-licensed fan recreation. See `src/assets/minecraft/ATTRIBUTION.md` and `src/assets/checklist/ATTRIBUTION.md`.

Development tooling follows the [Vite guide](https://vite.dev/guide/).

## Book reading

The book has a fixed 352 × 220 GUI canvas, accounting for the original atlas's transparent margins, and two 139px text areas. It retains the existing Minecraft-style font at its natural 8px width, with 9px line spacing; there is no horizontal text compression. Notes and decorated headings are centered; task text is left-aligned with a 20px checkbox gutter. Text areas are centered on each page. The 176px flow budget accounts for the 9px paint offset and leaves 2px before the raised arrows, with 9px between elements. Each task reserves the larger of its wrapped text height and its 18px checkbox height, followed by the same inter-task gap. A task or paragraph moves as a whole to the next page; its text is never shrunk to force a page count.

The original file has 93 explicit pages, including blank and hidden pages, and long pages can create additional reader pages. Page totals are derived from the calibrated font and original flow rules; they are not forced to match a guessed in-game total. Desktop spreads fit both viewport dimensions and reserve space for the controls and footer. Phones show one page at a time (up to 700px wide, or up to 1000px wide in a viewport at most 500px tall). Single pages scale to the available width, capped at 440px, and allow vertical scrolling on short screens rather than shrinking text when the keyboard opens. Switching layouts preserves the exact page anchor. Search width stays aligned with the book.

Use the corner arrows or press Left/Right anywhere on the page to turn pages (except while editing text). Home/End jump to the first/last page. The parchment sidebar lists chapters. Use the sidebar button to show or hide it; the reader recenters in the remaining space. Opening uses a short 250ms slide with a small settling overshoot; closing takes 160ms. Rapid toggles reverse from the current visual position, and the reduced-motion preference makes sidebar and layout changes immediate. Closed panels leave the keyboard tab order immediately. As pages change, the chapter list scrolls only when needed to keep the active chapter fully visible. Reopening the sidebar also reveals the current chapter. On narrow screens the sidebar starts closed and opens as an overlay; choosing a chapter, pressing Escape, or clicking outside closes it. Chapter navigation and search open the relevant page or desktop spread; Press `/` outside text fields to focus search immediately; the shortcut does not insert a slash or clear an existing query. The arrows beside the search match count move between matching pages, skipping matches already visible in a desktop spread. Enter in search advances to the next matching page; Shift+Enter goes back, wrapping at either end. The completion count stays centered and search navigation stays on the right. On narrow screens the result controls use a reserved second row, keeping the book size stable while searching. Arrow-button hover tooltips explain Enter and Shift+Enter without changing the book size. Checkboxes keep the original task IDs.

## Backgrounds

The active background is selected with `data-background="dirt"` on `<body>` in `index.html`. All scene styling lives in `src/background.css`. The dirt preset repeats the original 16 × 16 texture as a crisp 64px tile, under a dark overlay.

To try another background, add a `body[data-background='name']` preset and change the attribute. Presets set `--scene-texture`, `--scene-color`, `--scene-tile-size`, and `--scene-overlay`; they do not change viewer layout or component styles. Remove the attribute to return to the plain dark background. No background picker or extra runtime dependency is needed.
