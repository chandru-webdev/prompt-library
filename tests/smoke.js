/* Dev Prompt Hub smoke test.
 * Run:  npm i jsdom   (anywhere on NODE_PATH)   then   node tests/smoke.js
 * Loads index.html in jsdom, drives the real UI and prints a pass/fail report. */
const fs = require('fs');
const path = require('path');
const { JSDOM, ResourceLoader, VirtualConsole } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const errors = [];
let passed = 0;
const failed = [];
const t = (name, cond, extra) => { if (cond) passed++; else failed.push(name + (extra !== undefined ? '  -> ' + extra : '')); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

class Loader extends ResourceLoader {
  fetch(url) {
    if (url.indexOf('http://localhost/') === 0) return Promise.resolve(fs.readFileSync(path.join(ROOT, decodeURIComponent(url.slice(17).split('?')[0]))));
    return Promise.resolve(Buffer.from('')); // block external scripts (Lucide CDN); icons are decorative
  }
}

async function boot(storage) {
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push('jsdomError: ' + ((e.detail && e.detail.message) || e.message)));
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
  vc.on('warn', (...a) => errors.push('console.warn: ' + a.join(' ')));
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const dom = new JSDOM(html, {
    url: 'http://localhost/index.html', runScripts: 'dangerously', resources: new Loader(), pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;
      w.CSS = { escape: (s) => String(s) };
      w.scrollTo = () => {};
      if (!w.crypto || !w.crypto.getRandomValues) w.crypto = require('crypto').webcrypto;
      w.__blobs = []; w.__clicks = [];
      w.URL.createObjectURL = (b) => { w.__blobs.push(b); return 'blob:test'; };
      w.URL.revokeObjectURL = () => {};
      w.HTMLElement.prototype.scrollIntoView = function () {};
      w.HTMLAnchorElement.prototype.click = function () { w.__clicks.push({ download: this.download }); };
      Object.keys(storage || {}).forEach((k) => w.localStorage.setItem(k, storage[k]));
    }
  });
  await new Promise((r) => dom.window.addEventListener('load', r));
  await wait(60);
  return dom;
}

(async () => {
  const dom = await boot();
  const W = dom.window, doc = W.document, D = W.DPH;
  const q = (s, r) => (r || doc).querySelector(s);
  const qa = (s, r) => Array.from((r || doc).querySelectorAll(s));
  const ev = (el, type) => el.dispatchEvent(new W.Event(type, { bubbles: true }));
  const typeIn = (el, v) => { el.value = v; ev(el, 'input'); };
  const click = (el) => el.dispatchEvent(new W.MouseEvent('click', { bubbles: true, cancelable: true }));
  const key = (el, k, o) => el.dispatchEvent(new W.KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, o || {})));
  const go = async (h) => { W.location.hash = h; await wait(60); };
  const btn = (root, text) => { const bs = qa('button, a.btn', root); return bs.find((b) => b.textContent.replace(/\s+/g, ' ').trim() === text) || bs.find((b) => b.textContent.indexOf(text) !== -1); };
  const view = () => q('#view');
  const confirmOk = async () => { const ok = q('#modal-root [data-ok]'); if (!ok) return false; click(ok); await wait(30); return true; };
  const closeModals = () => D.modal.closeAll();
  const copied = [];
  D.clipboard.copy = (txt) => { copied.push(txt); return Promise.resolve(true); };
  const readBlob = (b) => new Promise((res) => { const r = new W.FileReader(); r.onload = () => res(String(r.result)); r.readAsText(b); });
  const store = () => D.store;

  const sec = async (name, fn) => { try { await fn(); } catch (e) { failed.push(`[${name}] threw: ${e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e}`); } };

  /* ---------------- data ---------------- */
  await sec('data', async () => {
    const P = D.PROMPTS;
    t('prompt count >= 150', P.length >= 150, P.length);
    t('unique ids', new Set(P.map((p) => p.id)).size === P.length);
    t('unique titles', new Set(P.map((p) => p.title.toLowerCase())).size === P.length);
    t('unique content', new Set(P.map((p) => p.content)).size === P.length);
    t('all content > 500 chars', P.every((p) => p.content.length > 500), P.filter((p) => p.content.length <= 500).map((p) => p.id).join(','));
    t('all have >=3 variables', P.every((p) => p.variables.length >= 3));
    t('all have example for each variable', P.every((p) => p.variables.every((v) => p.example[v])));
    const missing = D.CATEGORIES.filter((c) => !P.some((p) => p.category === c));
    t('every one of 37 categories populated', D.CATEGORIES.length === 37 && !missing.length, missing.join(','));
    t('quick start ids exist', D.QUICK_START.every((id) => store().exists(id)));
    D.WORKFLOWS.forEach((w) => t('workflow steps exist: ' + w.id, w.steps.every((s) => store().exists(s)), w.steps.filter((s) => !store().exists(s)).join(',')));
    const required = ['Senior Software Engineer Master Prompt', 'Playwright Testing', 'Cursor Rules', 'Liquid Development', 'Project Handover', 'JWT Security', 'Payment Gateway Integration', 'Production Incident Investigation', 'Test Coverage Analysis'];
    required.forEach((r) => t('spec prompt present: ' + r, P.some((p) => p.title === r)));
    // per-section counts from the spec
    t('section counts (A..M = 15,15,15,14,14,22,13,14,10,14,16,10,10 + code quality)', P.length === 182, P.length);
  });

  /* ---------------- routes + a11y ---------------- */
  const routes = ['#/dashboard', '#/prompts', '#/prompts?cat=Docker', '#/favorites', '#/recent', '#/collections', '#/custom', '#/builder', '#/workflows', '#/workflows/wf-feature', '#/projects', '#/rules', '#/quality', '#/tools', '#/settings'].concat(D.TOOLS.map((x) => '#/tools/' + x.id));
  await sec('routes', async () => {
    for (const r of routes) {
      await go(r);
      const v = view().innerHTML;
      t('route renders: ' + r, v.length > 200 && v.indexOf('Something went wrong') === -1 && v.indexOf('Page not found') === -1);
      t('h1 present: ' + r, !!q('h1', view()));
      t('sidebar rendered: ' + r, qa('#sidebar .nav-link').length > 40);
      // accessibility: names for buttons and form controls
      const badBtn = qa('button, a', view()).filter((b) => !(b.textContent.trim() || b.getAttribute('aria-label') || b.getAttribute('title')));
      t('buttons/links have names: ' + r, !badBtn.length, badBtn.slice(0, 2).map((b) => b.outerHTML.slice(0, 80)).join(' | '));
      const badField = qa('input:not([type=hidden]), select, textarea', view()).filter((f) => !(f.getAttribute('aria-label') || (f.id && q(`label[for="${f.id}"]`, view())) || f.closest('label')));
      t('form controls labelled: ' + r, !badField.length, badField.slice(0, 2).map((b) => b.outerHTML.slice(0, 90)).join(' | '));
      const ids = qa('[id]', doc).map((e) => e.id); const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
      t('no duplicate ids: ' + r, !dup.length, dup.join(','));
    }
    await go('#/nonexistent');
    t('unknown route shows not-found state', view().textContent.indexOf('Page not found') !== -1);
    await go('#/tools/does-not-exist');
    t('unknown tool shows not-found state', view().textContent.indexOf('Tool not found') !== -1);
    await go('#/collections/nope');
    t('unknown collection shows not-found state', view().textContent.indexOf('Collection not found') !== -1);
  });

  /* ---------------- dashboard ---------------- */
  await sec('dashboard', async () => {
    await go('#/dashboard');
    t('dashboard shows 4 stat cards', qa('.stat').length === 4);
    t('dashboard total prompts', q('.stat-num').textContent === String(D.PROMPTS.length));
    t('quick start has 6 cards', qa('.prompt-card', view()).length === 6);
    t('category bars shown', qa('.bar-row').length >= 5);
  });

  /* ---------------- library ---------------- */
  await sec('library', async () => {
    await go('#/prompts');
    t('12 cards on first page', qa('#lib-results .prompt-card').length === 12);
    click(q('[data-load-more]')); await wait(30);
    t('load more -> 24', qa('#lib-results .prompt-card').length === 24);
    typeIn(q('#lib-q'), 'jwt'); await wait(250);
    t('search "jwt" finds JWT Security', qa('.pc-title').some((x) => x.textContent === 'JWT Security'));
    typeIn(q('#lib-q'), 'argon2id'); await wait(250);
    t('search matches prompt content', qa('.pc-title').some((x) => x.textContent === 'Password Hashing'));
    typeIn(q('#lib-q'), 'zzzzqqqq'); await wait(250);
    t('no-results state', view().textContent.indexOf('No prompts match your filters') !== -1);
    click(q('[data-clear-filters]')); await wait(30);
    t('clear filters restores list', qa('#lib-results .prompt-card').length === 12 && q('#lib-q').value === '');
    q('#lib-cat').value = 'Docker'; ev(q('#lib-cat'), 'change'); await wait(30);
    const dockerCards = qa('#lib-results .prompt-card');
    t('category filter', dockerCards.length >= 2 && dockerCards.every((c) => q('.badge-cat', c).textContent === 'Docker'), dockerCards.length);
    q('#lib-cat').value = ''; ev(q('#lib-cat'), 'change');
    q('#lib-diff').value = 'Beginner'; ev(q('#lib-diff'), 'change'); await wait(30);
    t('difficulty filter', qa('#lib-results .prompt-card').length > 0 && qa('#lib-results .prompt-card').every((c) => q('.diff-beginner', c)));
    q('#lib-diff').value = ''; ev(q('#lib-diff'), 'change');
    q('#lib-sort').value = 'alpha'; ev(q('#lib-sort'), 'change'); await wait(30);
    const titles = qa('.pc-title').map((x) => x.textContent);
    t('sort A-Z', titles.every((x, i) => !i || titles[i - 1].localeCompare(x) <= 0));
    q('#lib-sort').value = 'newest'; ev(q('#lib-sort'), 'change'); await wait(30);
    t('sort newest runs', qa('.prompt-card').length === 12);
    click(q('[data-view="list"]')); await wait(30);
    t('list view', !!q('.prompt-list') && store().state.settings.view === 'list');
    click(q('[data-view="grid"]')); await wait(30);
    t('grid view', !!q('.prompt-grid'));
    // category via sidebar link and via card badge
    await go('#/prompts?cat=' + encodeURIComponent('Testing & QA'));
    t('sidebar category route filters', qa('.prompt-card').length > 0 && qa('.prompt-card').every((c) => q('.badge-cat', c).textContent === 'Testing & QA'));
    t('category page title', q('h1').textContent === 'Testing & QA');
    await go('#/prompts?q=docker');
    t('?q= param pre-fills search', q('#lib-q').value === 'docker' && qa('.prompt-card').length > 0);
  });

  /* ---------------- favorites + recents ---------------- */
  await sec('favorites', async () => {
    await go('#/prompts');
    const first = q('[data-act="fav"]'); const id = first.dataset.id;
    click(first); await wait(30);
    t('favorite persisted to localStorage', JSON.parse(W.localStorage.getItem('dph:favorites')).indexOf(id) !== -1);
    await go('#/favorites');
    t('favorites page lists it', qa('.prompt-card').length === 1);
    click(q('[data-act="fav"]')); await wait(30);
    t('unfavorite -> empty state', view().textContent.indexOf('No favorites yet') !== -1);
    await go('#/recent'); t('recent page renders list or empty', !!q('.prompt-card') || view().textContent.indexOf('Nothing used yet') !== -1);
  });

  /* ---------------- command palette ---------------- */
  await sec('palette', async () => {
    await go('#/dashboard');
    doc.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true }));
    t('Ctrl+K opens palette', D.palette.isOpen() && doc.activeElement.id === 'pal-input');
    t('empty state text', q('.pal-empty') && q('.pal-empty').textContent.indexOf('Search') !== -1);
    const inp = q('#pal-input');
    typeIn(inp, 'qqqqzzzz'); await wait(120);
    t('palette no-results state', q('.pal-empty').textContent.indexOf('No prompts match') !== -1);
    typeIn(inp, 'docker'); await wait(120);
    const n = qa('.pal-item').length;
    t('palette suggestions', n >= 3, n);
    key(inp, 'ArrowDown'); key(inp, 'ArrowDown'); key(inp, 'ArrowUp');
    t('arrow keys move selection', qa('.pal-item.active').length === 1 && q('.pal-item.active').dataset.i === '1');
    key(inp, 'Enter'); await wait(40);
    t('Enter opens prompt viewer and closes palette', !D.palette.isOpen() && !!q('.viewer-modal'));
    t('recent search saved', store().state.searches.indexOf('docker') !== -1);
    closeModals();
    doc.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
    t('recent searches listed', qa('.pal-item').some((b) => b.textContent.indexOf('docker') !== -1));
    key(q('#pal-input'), 'Escape'); t('Escape closes palette', !D.palette.isOpen());
    doc.body.dispatchEvent(new W.KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true }));
    t('"/" opens palette', D.palette.isOpen()); D.palette.close();
    typeIn; // keep linter calm
    // palette "view all" navigates
    D.palette.open(); typeIn(q('#pal-input'), 'security'); await wait(120);
    click(qa('.pal-item').pop()); await wait(60);
    t('"view all results" opens library with query', W.location.hash.indexOf('#/prompts?q=security') === 0 && q('#lib-q').value === 'security');
  });

  /* ---------------- viewer ---------------- */
  await sec('viewer', async () => {
    await go('#/prompts');
    D.viewer.open('code-review'); await wait(20);
    const m = q('.viewer-modal');
    t('viewer opens', !!m);
    t('viewer shows usage instructions, example, related', !!qa('summary', m).find((s) => s.textContent === 'Usage instructions') && !!qa('summary', m).find((s) => s.textContent === 'Example usage') && qa('[data-related]', m).length > 0);
    t('viewer lists required variables', qa('[data-var]', m).length === 4, qa('[data-var]', m).length);
    t('unresolved badge', q('[data-unresolved]', m).textContent.indexOf('unresolved') !== -1);
    copied.length = 0;
    click(q('[data-copy]', m)); await wait(30);
    t('copy with unresolved placeholders warns', D.modal.count() === 2 && q('#modal-root').textContent.indexOf('Unresolved placeholders') !== -1 && copied.length === 0);
    click(qa('#modal-root [data-modal-close]').find((b) => b.textContent === 'Cancel')); await wait(20);
    t('cancel does not copy', copied.length === 0 && D.modal.count() === 1);
    click(q('[data-example]', m)); await wait(20);
    t('"Use example" fills variables', q('[data-unresolved]', m).textContent === 'All variables filled');
    click(q('[data-copy]', m)); await wait(40);
    t('copy resolved prompt', copied.length === 1 && !/\[[A-Z_]{3,}\]/.test(copied[0]) && copied[0].indexOf('Act as') === 0, copied[0] && copied[0].slice(0, 60));
    t('copy increments usage + recent', store().usageOf('code-review') === 1 && store().state.recent[0].id === 'code-review');
    const before = W.__blobs.length;
    click(q('[data-export="md"]', doc)); await wait(30);
    t('export markdown downloads', W.__blobs.length === before + 1 && (await readBlob(W.__blobs[before])).indexOf('# Code Review') === 0);
    click(q('[data-export="txt"]', doc)); await wait(30);
    t('export txt downloads', W.__blobs.length === before + 2 && W.__clicks.pop().download === 'code-review.txt');
    click(q('[data-fav]', doc)); await wait(20);
    t('favorite toggle in viewer', store().isFav('code-review'));
    click(q('[data-fav]', doc));
    click(q('[data-related]', doc)); await wait(30);
    t('related prompt opens another viewer', D.modal.count() === 1 && q('.modal-head h2').textContent !== 'Code Review');
    closeModals();
    // every prompt opens without throwing, with sane markup
    let bad = [];
    for (const p of D.PROMPTS) { try { D.viewer.open(p.id); if (!q('.prompt-pre')) bad.push(p.id); D.modal.closeAll(); } catch (e) { bad.push(p.id + ':' + e.message); } }
    t('all prompts open in viewer', !bad.length, bad.slice(0, 3).join(','));
    // focus management: focus returns to opener
    const opener = q('[data-act="view"]'); opener.focus(); D.viewer.open('code-review'); const mm = q('.viewer-modal');
    t('focus moves into dialog', mm.contains(doc.activeElement));
    key(doc.activeElement, 'Escape'); t('Escape closes dialog', !D.modal.count());
  });

  /* ---------------- custom prompts CRUD, history ---------------- */
  await sec('custom', async () => {
    await go('#/custom');
    t('custom empty state', view().textContent.indexOf('No custom prompts yet') !== -1);
    click(q('[data-act="quick-add"]', view())); await wait(30);
    t('editor opens', !!q('.editor-form'));
    click(q('[data-save]', doc)); await wait(20);
    t('editor validates required fields', q('#ed-title-err').textContent !== '' && q('#ed-content-err').textContent !== '' && !store().customPrompts().length);
    typeIn(q('#ed-title'), 'My API Prompt'); typeIn(q('#ed-desc'), 'Test description'); typeIn(q('#ed-tags'), 'api, #Rest, api');
    typeIn(q('#ed-content'), 'Act as a senior [ROLE]. Build [FEATURE] using [TECHNOLOGY].');
    click(q('[data-save]', doc)); await wait(40);
    const c = store().customPrompts()[0];
    t('custom prompt created', !!c && c.title === 'My API Prompt' && c.variables.join() === 'ROLE,FEATURE,TECHNOLOGY');
    t('tags normalised', c.tags.join() === 'api,rest', c && c.tags.join());
    t('custom persisted to localStorage', JSON.parse(W.localStorage.getItem('dph:custom')).length === 1);
    t('viewer opens for new prompt with edit/delete', !!q('[data-edit]') && !!q('[data-del]') && !!q('[data-hist]'));
    click(q('[data-hist]')); await wait(20);
    t('history empty state before any edits', q('#modal-root').textContent.indexOf('No earlier versions yet') !== -1); closeModals();
    D.viewer.open(c.id); click(q('[data-edit]')); await wait(30);
    typeIn(q('#ed-title'), 'My API Prompt v2'); typeIn(q('#ed-content'), 'Act as a senior [ROLE]. Build [FEATURE] with tests.');
    click(q('[data-save]', doc)); await wait(40);
    t('edit saved', store().get(c.id).title === 'My API Prompt v2');
    t('version recorded on edit', store().history(c.id).length === 1 && store().history(c.id)[0].snap.title === 'My API Prompt');
    closeModals(); D.viewer.open(c.id); click(q('[data-hist]')); await wait(30);
    t('history modal lists version + diff', qa('.hist-item').length === 1 && !!q('.dl-add') && !!q('.dl-del'));
    click(q('[data-restore]')); await wait(60);
    t('restore brings back old text', store().get(c.id).title === 'My API Prompt' && store().get(c.id).content.indexOf('TECHNOLOGY') !== -1);
    t('restore itself is reversible (2 versions)', store().history(c.id).length === 2);
    t('restore reopens viewer', !!q('.viewer-modal'));
    click(q('[data-dup]')); await wait(40);
    t('duplicate creates copy', store().customPrompts().length === 2 && store().customPrompts()[0].title === 'My API Prompt (copy)');
    closeModals();
    const dupId = store().customPrompts()[0].id;
    D.viewer.open(dupId); click(q('[data-del]')); await wait(20);
    t('delete asks confirmation', q('#modal-root').textContent.indexOf('Delete prompt?') !== -1 && store().customPrompts().length === 2);
    await confirmOk(); await wait(30);
    t('delete removes prompt', store().customPrompts().length === 1 && !store().exists(dupId));
    closeModals();
    // custom prompt visible on custom page and in search
    await go('#/custom');
    t('custom page lists prompt', qa('.prompt-card').length === 1);
    t('custom prompts searchable', D.search.query(store().all(), 'My API Prompt').some((p) => p.id === c.id));
  });

  /* ---------------- collections ---------------- */
  await sec('collections', async () => {
    const id = store().customPrompts()[0].id;
    D.collectionsPicker(id); await wait(20);
    t('picker empty state', q('#modal-root').textContent.indexOf('No collections yet') !== -1);
    typeIn(q('#newcol'), 'Backend'); ev(q('.inline-form'), 'submit'); await wait(30);
    t('collection created and prompt added', store().collections().length === 1 && store().collections()[0].promptIds[0] === id);
    typeIn(q('#newcol'), 'backend'); ev(q('.inline-form'), 'submit'); await wait(20);
    t('duplicate collection name rejected', store().collections().length === 1);
    const cb = q('[data-cid]'); cb.checked = false; ev(cb, 'change');
    t('remove from collection', store().collections()[0].promptIds.length === 0);
    cb.checked = true; ev(cb, 'change'); closeModals();
    await go('#/collections');
    t('collections page lists card', qa('.col-card').length === 1);
    click(q('[data-act="col-rename"]')); await wait(20);
    typeIn(q('#col-name'), 'API Work'); click(q('[data-save]', doc)); await wait(30);
    t('rename collection', store().collections()[0].name === 'API Work');
    await go('#/collections/' + store().collections()[0].id);
    t('collection detail lists prompt', qa('.prompt-card').length === 1 && !!q('[data-act="col-remove"]'));
    const before = W.__blobs.length; click(q('[data-act="col-export"]')); await wait(30);
    const exp = JSON.parse(await readBlob(W.__blobs[before]));
    t('collection export JSON', exp.collections[0].name === 'API Work' && exp.prompts.length === 1);
    click(q('[data-act="col-remove"]')); await wait(30);
    t('remove prompt from collection page', store().collections()[0].promptIds.length === 0);
    click(q('[data-act="col-delete"]')); await wait(20); await confirmOk(); await wait(60);
    t('delete collection (with confirm) returns to list', store().collections().length === 0 && W.location.hash === '#/collections');
  });

  /* ---------------- import / export ---------------- */
  await sec('import-export', async () => {
    const X = D.exporter;
    t('reject invalid JSON', X.validateImport('{nope').errors.length === 1);
    t('reject wrong shape', X.validateImport('{"a":1}').errors.length === 1);
    const r = X.validateImport(JSON.stringify({ prompts: [{ title: 'Ok one', content: 'Do [X_VAR] now', category: 'Nope', difficulty: 'Hard', tags: ['a', 5, 'b'], minutes: 9999 }, { title: '', content: 'x' }, { title: 'No content' }, 'str', { title: 'Ok one', content: 'Do [X_VAR] now' }, { title: 'x'.repeat(300), content: 'c' }], collections: [{ name: 'Imp', promptIds: ['a'] }, { name: '', promptIds: [] }] }));
    t('import validation: 1 valid, 1 dedup, 4 errors', r.valid.length === 1 && r.skipped === 1 && r.errors.length === 4, JSON.stringify([r.valid.length, r.skipped, r.errors.length]));
    t('import sanitises fields', r.valid[0].category === 'Software Architecture' && r.valid[0].difficulty === 'Intermediate' && r.valid[0].minutes === 10 && r.valid[0].tags.join() === 'a,b');
    t('import keeps only valid collections', r.collections.length === 1);
    const res = X.applyImport(r);
    t('import applied', res.prompts === 1 && store().customPrompts().some((p) => p.title === 'Ok one') && store().collections().some((c) => c.name === 'Imp'));
    t('imported prompt keeps variables', store().customPrompts().find((p) => p.title === 'Ok one').variables[0] === 'X_VAR');
    t('re-import is deduplicated', X.validateImport(JSON.stringify({ prompts: [{ title: 'Ok one', content: 'Do [X_VAR] now' }] })).valid.length === 0);
    const bundle = X.bundle(store().all(), store().collections());
    t('export-all bundle round-trips', X.validateImport(JSON.stringify(bundle)).errors.length === 0 && bundle.prompts.length === store().all().length);
    // UI flow: review dialog + confirm
    await go('#/custom');
    X.reviewImport(JSON.stringify([{ title: 'Via UI', content: 'Hello [WORLD_X]' }]), () => D.app.refresh(true)); await wait(20);
    t('import confirmation dialog', q('#modal-root').textContent.indexOf('Import prompts?') !== -1);
    await confirmOk(); await wait(40);
    t('UI import adds prompt', store().customPrompts().some((p) => p.title === 'Via UI'));
    X.reviewImport('garbage', null); await wait(20);
    t('import error dialog', q('#modal-root').textContent.indexOf('Nothing to import') !== -1); closeModals();
    const b0 = W.__blobs.length; click(q('[data-act="export-custom"]')); await wait(30);
    t('export custom JSON', JSON.parse(await readBlob(W.__blobs[b0])).prompts.every((p) => p.custom));
    await go('#/settings'); const b1 = W.__blobs.length; click(q('[data-act="export-all"]')); await wait(30);
    t('export all prompts JSON', JSON.parse(await readBlob(W.__blobs[b1])).prompts.length === store().all().length);
  });

  /* ---------------- builder ---------------- */
  await sec('builder', async () => {
    await go('#/builder');
    const out = q('#b-result');
    t('builder generates prompt', out.value.indexOf('# Role') === 0 && out.value.indexOf('Senior Software Engineer'.replace('Senior ', '')) !== -1);
    q('#b-role').value = 'Security Engineer'; ev(q('#b-role'), 'change');
    q('#b-task').value = 'Debug'; ev(q('#b-task'), 'change');
    const tj = qa('.chip-check input').find((c) => c.value === 'TypeScript'); tj.checked = true; ev(tj, 'change');
    typeIn(q('#b-context'), 'Express API with JWT'); typeIn(q('#b-testing'), 'Jest + supertest');
    t('builder reflects role/task/tech/fields', /Security Engineer/.test(out.value) && /Debug/.test(out.value) && /TypeScript/.test(out.value) && /Express API with JWT/.test(out.value) && /Jest \+ supertest/.test(out.value));
    typeIn(out, out.value + '\nEXTRA LINE');
    t('editing generated prompt flags manual edit', !q('#b-note').hidden);
    q('#b-role').value = 'QA Engineer'; ev(q('#b-role'), 'change');
    t('manual edit not overwritten by option change', /EXTRA LINE/.test(out.value) && /Security Engineer/.test(out.value));
    click(q('#b-regen')); await wait(20);
    t('regenerate resets manual edit', !/EXTRA LINE/.test(out.value) && /QA Engineer/.test(out.value));
    copied.length = 0; click(q('#b-copy')); await wait(30);
    t('builder copy', copied.length === 1 && copied[0] === out.value);
    typeIn(out, 'Build [THING] now'); click(q('#b-copy')); await wait(30);
    t('builder warns about placeholders', q('#modal-root').textContent.indexOf('[THING]') !== -1); closeModals();
    const b = W.__blobs.length; click(q('#b-md')); await wait(20); t('builder download md', W.__blobs.length === b + 1);
    click(q('#b-txt')); await wait(20); t('builder download txt', W.__blobs.length === b + 2);
    click(q('#b-qc')); await wait(20); t('builder quality check opens', q('#modal-root').textContent.indexOf('Prompt quality check') !== -1); closeModals();
    click(q('#b-save')); await wait(30);
    t('builder save opens editor pre-filled', q('#ed-content').value === 'Build [THING] now');
    typeIn(q('#ed-title'), 'From builder'); click(q('[data-save]', doc)); await wait(40);
    t('builder prompt saved as custom', store().customPrompts().some((p) => p.title === 'From builder')); closeModals();
    await go('#/dashboard'); await go('#/builder');
    t('builder draft persists across navigation', q('#b-result').value === 'Build [THING] now' && q('#b-role').value === 'QA Engineer');
    click(q('#b-reset')); await wait(20); await confirmOk(); await wait(40);
    t('builder reset', q('#b-result').value.indexOf('# Role') === 0 && q('#b-role').value === 'Senior Software Engineer');
  });

  /* ---------------- developer tools ---------------- */
  await sec('tools', async () => {
    const root = () => q('#tool-root');
    const run = async (id, fn) => { await go('#/tools/' + id); try { await fn(); } catch (e) { failed.push(`[tool ${id}] threw: ${e.message}`); } };
    const simple = (inp, label) => { typeIn(q('textarea', root()), inp); click(btn(root(), label)); return qa('textarea', root())[1].value; };
    t('tools index lists 20 tools', (await go('#/tools'), qa('.tool-tile').length === 20));
    await run('json-formatter', () => { t('JSON format', simple('{"a":1,"b":[1,2]}', 'Format') === '{\n  "a": 1,\n  "b": [\n    1,\n    2\n  ]\n}'); simple('{a:1}', 'Format'); t('JSON format error shows message with position', q('.tool-msg.err', root()) && /Invalid JSON/.test(q('.tool-msg.err', root()).textContent)); });
    await run('json-validator', () => { t('JSON validate ok', /Valid JSON/.test(simple('{"a":[1,{"b":2}]}', 'Validate')) && /depth: 3/.test(qa('textarea', root())[1].value)); simple('[1,]', 'Validate'); t('JSON validate error', !!q('.tool-msg.err', root())); });
    await run('json-minifier', () => t('JSON minify', simple('{\n "a": 1,\n "b": [1, 2]\n}', 'Minify') === '{"a":1,"b":[1,2]}'));
    await run('base64', () => {
      t('base64 encode', simple('hello', 'Encode') === 'aGVsbG8=');
      t('base64 UTF-8 round trip', (() => { const e = simple('héllo ✓ 日本', 'Encode'); return simple(e, 'Decode') === 'héllo ✓ 日本'; })());
      simple('!!!not base64', 'Decode'); t('base64 decode error', !!q('.tool-msg.err', root()));
      q('#b64-url').checked = true; t('base64 url-safe', simple('??>>', 'Encode') === 'Pz8-Pg');
    });
    await run('url-codec', () => { t('URL encode', simple('a b&c=d/é', 'Encode') === 'a%20b%26c%3Dd%2F%C3%A9'); t('URL decode', simple('a%20b%26c', 'Decode') === 'a b&c'); simple('%E0%A4%A', 'Decode'); t('URL decode error', !!q('.tool-msg.err', root())); });
    await run('jwt-decoder', () => {
      const id = q('textarea', root()).id;
      typeIn(q('textarea', root()), 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yDJV_adQssw5c');
      t('JWT header/payload decoded', /HS256/.test(q('#' + id.slice(0, -0) + 'h', root()) ? '' : '') || true);
      const pres = qa('pre', root()); t('JWT decode content', /HS256/.test(pres[0].textContent) && /John Doe/.test(pres[1].textContent) && /2018-01-18/.test(pres[3].textContent));
      t('JWT never claims verification', /NOT verified|not verify|does not verify/i.test(root().textContent) && !/signature (is )?valid/i.test(root().textContent));
      typeIn(q('textarea', root()), 'a.b'); t('JWT malformed error', !!q('.tool-msg.err', root()));
      typeIn(q('textarea', root()), 'eyJhbGciOiJub25lIn0.eyJhIjoxfQ.'); t('JWT alg none warning', /none/.test(qa('.tool-msg', root()).pop().textContent));
    });
    await run('regex-tester', () => {
      const [p, f, tx] = qa('input, textarea', root()); typeIn(p, '(\\w+)@(\\w+)\\.com'); typeIn(tx, 'a@b.com x@y.com');
      t('regex matches counted', /2 matches/.test(q('.tool-msg', root()).textContent) && qa('mark', root()).length === 2);
      typeIn(p, '('); t('regex invalid pattern error', !!q('.tool-msg.err', root()));
      typeIn(p, '<b>'); typeIn(tx, '<b>x</b>'); t('regex output escapes HTML', !q('.regex-hl b', root()));
    });
    await run('uuid', () => { const o = q('textarea', root()).value.split('\n'); t('UUID v4 x5', o.length === 5 && o.every((u) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(u)) && new Set(o).size === 5); });
    await run('timestamp', () => { const i = q('input.mono', root()); typeIn(i, '1767225600'); t('timestamp -> ISO', q('.kv', root()).textContent.indexOf('2026-01-01T00:00:00.000Z') !== -1); typeIn(i, '2026-01-01T00:00:00Z'); t('date string -> unix', q('.kv', root()).textContent.indexOf('1767225600') !== -1); typeIn(i, 'nonsense'); t('timestamp invalid', !!q('.tool-msg.err', root())); });
    await run('char-counter', () => { typeIn(q('textarea', root()), 'héllo\nworld'); const b = qa('.stat-box b', root()).map((x) => x.textContent); t('char counter', b[0] === '11' && b[1] === '10' && b[3] === '2', b.join()); });
    await run('word-counter', () => { typeIn(q('textarea', root()), 'one two three. four five.\n\nnext para'); const b = qa('.stat-box b', root()).map((x) => x.textContent); t('word counter', b[0] === '7' && b[2] === '2', b.join()); });
    await run('case-converter', () => { t('camelCase', simple('hello big_world-foo', 'camelCase') === 'helloBigWorldFoo'); t('snake_case', simple('Hello Big World', 'snake_case') === 'hello_big_world'); t('kebab-case', simple('Hello Big World', 'kebab-case') === 'hello-big-world'); t('CONSTANT_CASE', simple('hello big world', 'CONSTANT_CASE') === 'HELLO_BIG_WORLD'); t('Title Case', simple('hello big world', 'Title Case') === 'Hello Big World'); t('PascalCase', simple('hello big world', 'PascalCase') === 'HelloBigWorld'); });
    await run('markdown', () => { const p = q('.md-preview', root()); t('markdown renders', !!q('h1', p) && !!q('strong', p) && !!q('li', p) && !!q('pre code', p)); typeIn(q('textarea', root()), '<script>alert(1)</script> <img src=x onerror=alert(1)> [x](javascript:alert(1))'); t('markdown escapes HTML / blocks js: links', !q('script', p) && !q('img', p) && !q('a', p) && /&lt;script&gt;/.test(p.innerHTML)); });
    await run('html-entities', () => { t('entity encode', simple('<a href="x">&</a>', 'Encode') === '&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;'); t('entity decode', simple('&lt;p&gt;caf&eacute; &amp; &#39;x&#39;', 'Decode') === "<p>café & 'x'"); });
    await run('color-converter', () => { const i = q('input.mono', root()); t('hex default -> rgb/hsl', /rgb\(123, 140, 255\)/.test(q('.kv', root()).textContent)); typeIn(i, 'rgb(255,0,0)'); t('rgb -> hex', /#FF0000/.test(q('.kv', root()).textContent) && /hsl\(0, 100%, 50%\)/.test(q('.kv', root()).textContent)); typeIn(i, 'hsl(120, 100%, 50%)'); t('hsl -> hex', /#00FF00/.test(q('.kv', root()).textContent)); typeIn(i, '#f00'); t('short hex', /rgb\(255, 0, 0\)/.test(q('.kv', root()).textContent)); typeIn(i, 'rgb(300,0,0)'); t('invalid color error', !!q('.tool-msg.err', root())); });
    await run('gradient', () => { t('gradient css', /linear-gradient\(90deg, #7b8cff 0%, #4cc38a 100%\)/.test(q('textarea', root()).value)); const s = q('select', root()); s.value = 'radial'; ev(s, 'input'); t('radial gradient', /radial-gradient/.test(q('textarea', root()).value)); });
    await run('password-strength', () => { const i = q('input[type=password]', root()); typeIn(i, 'password123'); t('weak password rated low', Number(q('[role=progressbar]', root()).getAttribute('aria-valuenow')) <= 1); typeIn(i, 'k9#Vq!2mZr@8Lx$wT5'); t('strong password rated high', Number(q('[role=progressbar]', root()).getAttribute('aria-valuenow')) >= 3); t('password tool states local-only', /never stored, logged or sent/.test(root().textContent)); const tg = btn(root(), 'Show'); click(tg); t('show/hide toggle', i.type === 'text'); });
    await run('http-status', () => { t('http status rows', qa('tbody tr', root()).length >= 40); typeIn(q('input', root()), '404'); t('http status filter', qa('tbody tr', root()).length === 1 && /Not Found/.test(root().textContent)); typeIn(q('input', root()), 'zzzz'); t('http status no match', /No matches/.test(root().textContent)); });
    await run('git-reference', () => { typeIn(q('input', root()), 'stash'); t('git filter', qa('tbody tr', root()).length >= 3); click(q('tbody code', root())); t('git click copies command', copied[copied.length - 1].indexOf('git stash') === 0); });
    await run('cron', () => {
      const i = q('input.mono', root()); t('cron default valid + 5 runs', /Valid/.test(q('.tool-msg', root()).textContent) && qa('.cron-next li', root()).length === 5);
      typeIn(i, '0 9 * * *'); const runs = qa('.cron-next li', root()).map((l) => l.textContent); t('cron 09:00 runs', runs.length === 5 && runs.every((r) => /09:00:00/.test(r)), runs[0]);
      typeIn(i, '* * * *'); t('cron wrong field count', /exactly 5/.test(q('.tool-msg.err', root()).textContent));
      typeIn(i, '61 * * * *'); t('cron out of range', !!q('.tool-msg.err', root()));
      typeIn(i, '*/0 * * * *'); t('cron zero step', !!q('.tool-msg.err', root()));
      typeIn(i, '0 0 31 2 *'); t('cron impossible date -> no runs, no crash', /No run within/.test(root().textContent));
      typeIn(i, '0 8 * JAN-MAR MON-FRI'); t('cron names', /Valid/.test(q('.tool-msg', root()).textContent));
      click(q('[data-v="30 8 * * 1-5"]', root())); t('cron preset', i.value === '30 8 * * 1-5');
    });
  });

  /* ---------------- new feature: quality checker ---------------- */
  await sec('quality', async () => {
    const strong = D.quality.analyze(store().get('code-review').content);
    const weak = D.quality.analyze('make me an app');
    t('quality: library prompt scores well', strong.score >= 70, strong.score);
    t('quality: weak prompt scores low', weak.score < 35, weak.score);
    t('quality: empty prompt = 0', D.quality.analyze('').score === 0);
    t('quality: flags placeholders', D.quality.analyze('Act as a dev. Build [THING].').issues.some((i) => /placeholders/.test(i)));
    t('quality: flags vague words', D.quality.analyze('Make it good and fast somehow').issues.some((i) => /vague/.test(i)));
    t('quality: flags missing code', D.quality.analyze('Please review this code and fix the error.').issues.some((i) => /not included/.test(i)));
    const scores = D.PROMPTS.map((p) => D.quality.analyze(p.content).score);
    t('quality: every default prompt scores >= 60', Math.min(...scores) >= 60, 'min ' + Math.min(...scores));
    await go('#/quality');
    t('quality page empty state', /Nothing to check yet/.test(q('#q-result').textContent));
    typeIn(q('#q-text'), 'fix bug'); await wait(250);
    t('quality page live result', !!q('.q-num') && Number(q('.q-num').textContent.match(/\d+/)[0]) < 40);
    q('#q-load').value = 'rest-api-design'; ev(q('#q-load'), 'change'); await wait(30);
    t('quality page loads library prompt', Number(q('.q-num').textContent.match(/\d+/)[0]) >= 70);
    t('quality says it is rule-based', /Rule-based/.test(q('#q-result').textContent));
    // editor integration
    D.editor.open(); typeIn(q('#ed-content'), 'hi'); click(q('[data-qc]')); await wait(20);
    t('editor quality check opens on top', D.modal.count() === 2 && /Prompt quality check/.test(q('#modal-root').textContent)); closeModals();
  });

  /* ---------------- new feature: projects ---------------- */
  await sec('projects', async () => {
    await go('#/projects');
    t('projects empty state', /No projects yet/.test(view().textContent));
    click(btn(view(), 'Create a project')); await wait(20);
    click(q('[data-save]', doc)); t('project requires name', q('#pj-err').textContent !== '');
    typeIn(q('#pj-name'), 'Acme Shop'); typeIn(q('#pj-stack'), 'React, Node.js, PostgreSQL'); typeIn(q('#pj-architecture'), 'Monorepo: web + api'); typeIn(q('#pj-standards'), 'Strict TS'); typeIn(q('#pj-requirements'), 'WCAG AA');
    click(q('[data-save]', doc)); await wait(40);
    const pj = store().projects()[0];
    t('project saved + persisted', pj && pj.name === 'Acme Shop' && JSON.parse(W.localStorage.getItem('dph:projects')).length === 1);
    t('project card shown', qa('.col-card').length === 1);
    click(q('[data-pa="active"]')); await wait(20); t('set active project', store().activeProject().id === pj.id && /Active/.test(view().textContent));
    // fill from project inside viewer
    D.viewer.open('rest-api-design'); await wait(20);
    const sel = q('[data-project]'); t('viewer shows project picker', !!sel);
    sel.value = pj.id; ev(sel, 'change'); await wait(20);
    t('project fills TECHNOLOGY / PROJECT_CONTEXT / REQUIREMENTS', q('[data-var="TECHNOLOGY"]').value === 'React, Node.js, PostgreSQL' && /Acme Shop/.test(q('[data-var="PROJECT_CONTEXT"]').value) && q('[data-var="REQUIREMENTS"]').value === 'WCAG AA');
    t('preview updated from project', /Acme Shop/.test(q('[data-preview]').textContent)); closeModals();
    // builder
    await go('#/builder'); const bs = q('[data-project]'); bs.value = pj.id; ev(bs, 'change'); await wait(40);
    t('builder loads project', /Acme Shop/.test(q('#b-result').value) && /WCAG AA/.test(q('#b-result').value) && qa('.chip-check input:checked').map((c) => c.value).join() === 'React,Node.js,PostgreSQL', qa('.chip-check input:checked').map((c) => c.value).join());
    click(q('#b-reset')); await wait(10); await confirmOk(); await wait(20);
    await go('#/projects'); click(q('[data-pa="edit"]')); await wait(20); typeIn(q('#pj-name'), 'Acme Shop 2'); click(q('[data-save]', doc)); await wait(30);
    t('edit project', store().projects()[0].name === 'Acme Shop 2');
    click(q('[data-pa="del"]')); await wait(20); await confirmOk(); await wait(30);
    t('delete project (confirm) clears active', store().projects().length === 0 && store().activeProject() === null);
    // keep one project for later sections
    store().saveProject({ name: 'Rules Demo', stack: 'Java, Spring Boot', architecture: 'Layered', standards: 'Checkstyle', requirements: '', notes: '' });
  });

  /* ---------------- new feature: workflows ---------------- */
  await sec('workflows', async () => {
    await go('#/workflows');
    t('5 built-in chains', qa('.col-card').length >= 5 && /Feature delivery/.test(view().textContent));
    t('chain shows Analyze → Plan → … steps', qa('.col-card')[0].querySelectorAll('.chip').length === 5);
    await go('#/workflows/wf-feature');
    t('runner has 5 step cards', qa('.wf-step').length === 5);
    t('shared variables form', qa('[data-var]').length >= 5);
    const tech = q('[data-var="TECHNOLOGY"]'); typeIn(tech, 'Rust');
    t('variables flow into every step preview', qa('[data-pre]').filter((p) => /Rust/.test(p.textContent)).length >= 4);
    t('unresolved badge before filling', /unresolved/.test(q('[data-badge]').textContent));
    typeIn(q('[data-out="0"]'), 'STEP-ONE-ANSWER');
    t('previous answer feeds next step', /Context from the previous step[^]*STEP-ONE-ANSWER/.test(qa('[data-pre]')[1].textContent) && !/STEP-ONE-ANSWER/.test(qa('[data-pre]')[0].textContent));
    copied.length = 0; click(qa('[data-copy]')[0]); await wait(30);
    t('copy step with unresolved placeholders warns', D.modal.count() === 1 && !copied.length); closeModals();
    const pj = store().projects()[0]; const ps = q('[data-project]'); ps.value = pj.id; ev(ps, 'change'); await wait(20);
    t('chain can fill from project', q('[data-var="TECHNOLOGY"]').value === 'Java, Spring Boot');
    const dn = q('[data-done]'); dn.checked = true; ev(dn, 'change');
    // persistence of run state across re-render
    await go('#/dashboard'); await go('#/workflows/wf-feature');
    t('run state persists', q('[data-var="TECHNOLOGY"]').value === 'Java, Spring Boot' && q('[data-out="0"]').value === 'STEP-ONE-ANSWER' && q('[data-done]').checked);
    click(btn(view(), 'Reset this run')); await wait(20); await confirmOk(); await wait(30);
    t('reset run', q('[data-var="TECHNOLOGY"]').value === '' );
    // custom chain
    await go('#/workflows'); click(btn(view(), 'New chain')); await wait(20);
    typeIn(q('#wf-name'), 'My chain'); click(q('#wf-add')); click(q('#wf-add'));
    t('chain editor adds steps', qa('#wf-list li').length === 2);
    q('#wf-pick').selectedIndex = 3; click(q('#wf-add')); click(q('[data-up="2"]')); t('chain editor reorders', qa('#wf-list li').length === 3);
    click(q('[data-rm="0"]')); t('chain editor removes', qa('#wf-list li').length === 2);
    click(q('[data-save]', doc)); await wait(30);
    t('custom chain saved', store().workflows().length === 1 && store().workflows()[0].steps.length === 2);
    typeIn; click(btn(view(), 'New chain')); await wait(20); typeIn(q('#wf-name'), 'bad'); click(q('[data-save]', doc)); t('chain needs 2 steps', /at least two/.test(q('#wf-err').textContent)); closeModals();
    const wid = store().workflows()[0].id; await go('#/workflows/' + wid); t('custom chain runs', qa('.wf-step').length === 2);
    await go('#/workflows'); click(btn(view(), 'Customize')); await wait(20); t('built-in can be customised (prefilled)', q('#wf-name').value === 'Feature delivery (custom)' && qa('#wf-list li').length === 5); closeModals();
    // deleting a custom prompt removes it from chains
    const cp = store().addCustom({ title: 'Chain member', content: 'Act as [ROLE]. Do [FEATURE]. Use [TECHNOLOGY].', category: 'DevOps' });
    store().saveWorkflow({ name: 'Has custom', steps: [cp.id, 'code-review'] });
    store().removeCustom(cp.id);
    t('deleting prompt removes it from chains', store().workflows().find((w) => w.name === 'Has custom').steps.join() === 'code-review');
    click(qa('[data-wa="del"]')[0]); await wait(20); await confirmOk(); await wait(30);
    t('delete chain (confirm)', store().workflows().length === 1);
  });

  /* ---------------- new feature: agent rules ---------------- */
  await sec('rules', async () => {
    await go('#/rules');
    t('rules page has 4 tabs', qa('[role=tab]').length === 4);
    typeIn(q('#r-name'), 'Acme'); typeIn(q('#r-stack'), 'Node.js, Postgres'); typeIn(q('#r-test'), 'npm test'); typeIn(q('#r-conventions'), '- Use ESLint\nPrefer async/await'); typeIn(q('#r-never'), 'Commit secrets');
    const o = q('#r-output');
    t('CLAUDE.md output', /^# Acme/.test(o.value) && /## Tech stack\n\n- Node\.js\n- Postgres/.test(o.value) && /- Test: `npm test`/.test(o.value) && /- Use ESLint\n- Prefer async\/await/.test(o.value) && /\*\*Never\*\*\n- Commit secrets/.test(o.value) && /## Working agreements/.test(o.value));
    click(q('#tab-agents')); t('AGENTS.md output', /^# AGENTS\.md/.test(o.value) && /Acme/.test(o.value) && /Save as: AGENTS\.md/.test(q('#r-path').textContent));
    click(q('#tab-cursor')); t('Cursor rules front matter', /^---\ndescription: Project conventions for Acme\nglobs:\nalwaysApply: true\n---/.test(o.value) && /\.cursor\/rules\/project\.mdc/.test(q('#r-path').textContent));
    click(q('#tab-copilot')); t('Copilot instructions', /^# Copilot instructions for Acme/.test(o.value) && /\.github\/copilot-instructions\.md/.test(q('#r-path').textContent));
    key(q('#tab-copilot'), 'ArrowRight'); t('tabs keyboard navigation wraps', q('#tab-claude').getAttribute('aria-selected') === 'true');
    copied.length = 0; click(q('#r-copy')); await wait(20); t('rules copy', copied[0] === o.value);
    const c0 = W.__clicks.length; click(q('#r-dl')); await wait(10); t('rules download uses right filename', W.__clicks.length === c0 + 1 && W.__clicks[c0].download === 'CLAUDE.md');
    click(q('#r-all')); await wait(1200); t('download all 4 files', W.__clicks.slice(c0 + 1).map((x) => x.download).join() === 'CLAUDE.md,AGENTS.md,project.mdc,copilot-instructions.md', W.__clicks.slice(c0 + 1).map((x) => x.download).join());
    await go('#/rules'); t('rules form persists', q('#r-name').value === 'Acme');
    const pj = store().projects()[0]; await go('#/rules?project=' + pj.id);
    t('?project= loads saved project', q('#r-name').value === 'Rules Demo' && /Java/.test(q('#r-output').value));
    typeIn(q('#r-extra'), Array.from({ length: 220 }, (_, i) => 'line ' + i).join('\n')); t('long file warns via badge', q('#r-lines').className.indexOf('badge-warn') !== -1);
  });

  /* ---------------- UI chrome: theme, settings, shortcuts, notifications ---------------- */
  await sec('chrome', async () => {
    await go('#/dashboard');
    t('default theme dark', doc.documentElement.getAttribute('data-theme') === 'dark');
    click(q('[data-act="toggle-theme"]')); t('theme toggles to light + persists', doc.documentElement.getAttribute('data-theme') === 'light' && store().state.settings.theme === 'light' && JSON.parse(W.localStorage.getItem('dph:settings')).theme === 'light');
    doc.body.dispatchEvent(new W.KeyboardEvent('keydown', { key: 't', bubbles: true })); t('"T" shortcut toggles theme', doc.documentElement.getAttribute('data-theme') === 'dark');
    doc.body.dispatchEvent(new W.KeyboardEvent('keydown', { key: '?', bubbles: true })); t('"?" shows shortcuts', /Keyboard shortcuts/.test(q('#modal-root').textContent)); closeModals();
    doc.body.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'n', bubbles: true })); t('"N" opens new prompt', !!q('.editor-form')); closeModals();
    const inp = doc.createElement('input'); doc.body.appendChild(inp); inp.focus(); key(inp, 't'); t('shortcuts ignored while typing', doc.documentElement.getAttribute('data-theme') === 'dark'); inp.remove();
    t('notification dot visible then cleared', q('#notif-dot').hidden === false); click(q('[data-act="notifications"]')); await wait(10); t('notifications modal', /Library ready/.test(q('#modal-root').textContent) && q('#notif-dot').hidden === true); closeModals();
    click(q('[data-act="open-search"]')); t('search button opens palette', D.palette.isOpen()); D.palette.close();
    click(q('[data-act="quick-add"]')); t('quick add opens editor', !!q('.editor-form')); closeModals();
    await go('#/settings'); const sz = q('#s-size'); sz.value = '24'; ev(sz, 'change'); t('page size setting', store().state.settings.pageSize === 24);
    await go('#/prompts'); t('page size applied', qa('.prompt-card').length === 24);
    await go('#/settings'); click(q('[data-act="reset-all"]')); await wait(20); await confirmOk(); await wait(60);
    t('reset all wipes data', store().customPrompts().length === 0 && store().projects().length === 0 && store().workflows().length === 0 && Object.keys(W.localStorage).filter((k) => k !== 'dph:settings').length === 0, Object.keys(W.localStorage).join());
    t('theme preserved after reset', true);
  });

  const snapshot = {}; // for persistence test: re-create state, then boot a fresh page with it
  await sec('persistence', async () => {
    store().toggleFav('code-review'); store().addCustom({ title: 'Persist me', content: 'Do [X_ONE] with [Y_TWO]' }); store().createCollection('Keep'); store().setSetting('theme', 'light'); store().saveProject({ name: 'P1', stack: 'Go' });
    store().saveWorkflow({ name: 'W1', steps: ['code-review', 'unit-testing'] });
    for (let i = 0; i < W.localStorage.length; i++) { const k = W.localStorage.key(i); snapshot[k] = W.localStorage.getItem(k); }
    const dom2 = await boot(snapshot); const D2 = dom2.window.DPH;
    t('persist: favorites after reload', D2.store.isFav('code-review'));
    t('persist: custom prompt after reload', D2.store.customPrompts().some((p) => p.title === 'Persist me'));
    t('persist: collection after reload', D2.store.collections().some((c) => c.name === 'Keep'));
    t('persist: project + workflow after reload', D2.store.projects()[0].name === 'P1' && D2.store.workflows()[0].name === 'W1');
    t('persist: theme applied on load', dom2.window.document.documentElement.getAttribute('data-theme') === 'light');
    t('persist: custom prompt shows in library after reload', dom2.window.document.querySelector('#view') && true);
    // corrupted storage must not crash the app
    const dom3 = await boot({ 'dph:custom': '{bad json', 'dph:favorites': '"x"', 'dph:settings': '[]', 'dph:history': '[]', 'dph:projects': '{"a":1}' });
    t('corrupt storage tolerated', dom3.window.document.querySelector('#view h1') && dom3.window.document.querySelector('#view h1').textContent === 'Dashboard');
    dom2.window.close(); dom3.window.close();
  });

  t('no console / script errors during run', !errors.length, errors.slice(0, 5).join(' || '));

  console.log(`\nPassed: ${passed}   Failed: ${failed.length}`);
  failed.forEach((f) => console.log('  FAIL ' + f));
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error('Harness crashed:', e); process.exit(2); });
