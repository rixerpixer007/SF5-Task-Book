# Project guidance

This folder is the canonical home of the SkyFactory 5 task-book viewer.

- Keep original task wording, order, source page numbers, and task IDs intact.
- Work in `src/` and `index.html`; preserve the untouched `reference/` baseline.
- The design direction is Minecraft's book-reading experience combined with macOS Preview's document navigation and tools. The current UI is a responsive two-page reader with a collapsible chapter sidebar; the original prototype is preserved in `reference/`.
- Prefer the existing plain JavaScript/CSS structure until a feature justifies more dependencies.
- Run `npm run format` after edits, then `npm run build` before handing off.
- Use `npm run dev` for live development on http://127.0.0.1:5173. Reuse a running server; don't silently choose another port.
- Preserve the existing `sf5-task-book-v1` progress key and stable IDs. Save reading position by source/task anchor, and keep storage failures non-fatal.
- Respect reduced-motion preferences for sidebar and layout transitions.
- Browser visual verification and successful source/build checks are separate evidence; report them accurately.
- Current library/tool setup or API questions require the Context7 CLI documentation lookup specified in the user's global AGENTS.md instructions.

## Focus styling

- Do not add outer focus outlines, rings, glows, or offset borders to styled components by default. In particular, clicking the search field must not add an outline around its parchment frame.
- Keep keyboard focus feedback subtle and inside the existing component design (for example, an icon or border color change), rather than introducing an external ring. Preserve keyboard navigation and text-input behavior.
