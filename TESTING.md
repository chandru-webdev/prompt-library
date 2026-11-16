# Testing report

Date: 2026-11-16 · Build: Dev Prompt Hub with the five additional features (quality checker, version history, project contexts, workflow chains, agent-rules generator).

## Summary

| Layer | Tool | Result |
|---|---|---|
| UI behaviour (routes, library, viewer, CRUD, import/export, tools, new features, persistence, a11y checks) | `tests/smoke.js` on jsdom 24 | **482 passed, 0 failed** |
| Layout, icons, console errors in a real browser | Chromium via Playwright, 19 routes at 1440, 820 and 390 px | No horizontal overflow, icons render on every route, 0 console or page errors |
| Visual review | Screenshots reviewed (dashboard dark and light, workflow runner, rules, mobile viewer) | Pass after the fixes below |

Run the automated test yourself:

```bash
npm i jsdom@24        # jsdom 25+ removed the ResourceLoader API the test uses
node tests/smoke.js   # exits 1 if anything fails
```

## What the automated test covers

- **Data:** 182 prompts, unique ids/titles/content, every prompt has at least 3 variables with example values, all 37 categories populated, all workflow steps exist.
- **Routing:** 15 pages and all 20 tools render; unknown routes show a not-found state; every route is checked for unnamed buttons, unlabeled form controls and duplicate element ids.
- **Library:** pagination, search over title/description/content, category and difficulty filters, sorting, no-results state, grid/list views, favorites persistence.
- **Search palette:** Ctrl+K, `/`, suggestions, arrow keys, Enter, recent searches, empty and no-result states, Escape.
- **Viewer:** variable form, unresolved-placeholder warning, example fill, resolved copy, TXT/Markdown export, related prompts, focus handling. All 182 prompts open without errors.
- **Custom prompts:** validation, create, edit, duplicate, delete with confirmation, tag normalisation, persistence.
- **Collections:** create, duplicate-name rejection, rename, add/remove, export, delete with confirmation.
- **Import/export:** rejects malformed JSON and wrong shapes, sanitises fields, de-duplicates, handles collections, round-trips a full export, confirmation and error dialogs.
- **Builder:** generation, manual-edit protection, regenerate, copy, placeholder warning, downloads, save as custom, draft persistence, reset.
- **All 20 tools** with known inputs and error cases (for example Base64 UTF-8 round trip, JWT sample token, `alg: none` warning, regex HTML escaping, Markdown XSS payloads, cron validation and next-run times).
- **New features:** quality scoring and issue detection; version history, diff and reversible restore; project contexts filling the viewer, builder, chains and rules; workflow runner with shared variables, answer hand-off, saved progress, custom chains, cleanup when a prompt is deleted; rules output for all four formats, keyboard-navigable tabs, filenames, `?project=` loading.
- **Chrome and persistence:** theme toggle and persistence, shortcuts (ignored while typing), notifications, settings, reset-all, state after a simulated reload, and tolerance of corrupted `localStorage`.

## Bugs found and fixed during testing

1. **Builder id collision:** the "Expected output" field and the generated-prompt box shared `id="b-output"`, so the label and lookups could hit the wrong element. Renamed the generated box to `b-result`.
2. **Pluralisation:** the regex tester said "2 matchs". `plural()` now handles words ending in s, x, z, ch and sh.
3. **Drawer controls on desktop:** the hamburger and the sidebar close button showed on wide screens because `.btn` overrode `display: none`. Fixed in `responsive.css`.
4. **Mobile search placeholder** wrapped onto two lines; now truncates with an ellipsis.
5. Three failures were mistakes in the test itself (wrong selector, a double-opened dialog, a wrong expected count) and were corrected.

## Not verified / known limitations

- **Real clipboard and real downloads:** jsdom stubs both. The clipboard code has a `document.execCommand` fallback for non-secure contexts, but I have not exercised it in a real browser. Test Copy and Download once on your machine.
- **Browsers:** only Chromium was run. Firefox and Safari were not tested.
- **Assistive technology:** no screen-reader or manual keyboard-only pass was done. Automated checks cover names, labels, ids, focus entry and Escape. Contrast was designed for but not measured with a tool.
- **Prompt content:** the 182 prompts are generated from structured specs. Each has its own objective and focus areas, but the "working process" section is shared within each prompt type (build, plan, debug, review, test, doc). They are professional starting points, not hand-written essays. Please read the ones you will rely on.
- **Quality Checker:** it is rule-based (keywords and structure), not an AI review. It can miss real problems and can reward keyword stuffing.
- **Password checker:** entropy and crack-time are rough estimates, not a guarantee.
- **Markdown previewer:** supports a common subset only (headings, emphasis, code, links, lists, quotes, rules); no tables or images. Raw HTML is never rendered.
- **Cron helper:** standard 5-field syntax only; no seconds, `L`, `W` or `#`. The plain-English summary is approximate.
- **Storage:** about 5 MB per browser. Data lives only in that browser profile; export for backups.
- **Download all (rules):** triggers four separate downloads. Some browsers ask permission.
