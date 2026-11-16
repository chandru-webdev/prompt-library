(function () {
  'use strict';
  const D = (window.DPH = window.DPH || {});
  D.state = D.state || { lib: {} };

  // Shared list renderer used by the library, favorites, recents, custom and collection pages.
  D.renderList = function (el, cfg) {
    const s = D.state.lib[cfg.key] || (D.state.lib[cfg.key] = { q: '', cat: '', diff: '', sort: 'relevance', page: 1, applied: null });
    if (cfg.route && s.applied !== cfg.route.hash) {
      s.applied = cfg.route.hash;
      s.cat = cfg.route.params.cat || '';
      s.q = cfg.route.params.q || '';
      s.page = 1;
    }
    const view = D.store.state.settings.view;
    const sortOpts = [['relevance', 'Best match'], ['newest', 'Newest'], ['popular', 'Most popular'], ['alpha', 'A to Z']];
    const sourceCats = Array.from(new Set(cfg.source().map((p) => p.category))).sort((a, b) => D.CATEGORIES.indexOf(a) - D.CATEGORIES.indexOf(b));

    el.innerHTML = `
      <div class="page-head"><div><h1>${D.esc(cfg.title)}</h1>${cfg.subtitle ? `<p>${D.esc(cfg.subtitle)}</p>` : ''}</div>${cfg.actions ? `<div class="page-actions">${cfg.actions}</div>` : ''}</div>
      <div class="toolbar" role="search">
        <div class="search-box">${D.icon('search')}<label class="sr-only" for="lib-q">Filter prompts</label><input id="lib-q" class="input" type="search" placeholder="Search title, description, content, tags…" value="${D.esc(s.q)}" autocomplete="off"></div>
        <label class="sr-only" for="lib-cat">Category</label><select id="lib-cat" class="select"><option value="">All categories</option>${sourceCats.map((c) => `<option ${c === s.cat ? 'selected' : ''}>${D.esc(c)}</option>`).join('')}</select>
        <label class="sr-only" for="lib-diff">Difficulty</label><select id="lib-diff" class="select"><option value="">Any difficulty</option>${D.DIFFICULTIES.map((c) => `<option ${c === s.diff ? 'selected' : ''}>${c}</option>`).join('')}</select>
        <label class="sr-only" for="lib-sort">Sort</label><select id="lib-sort" class="select">${sortOpts.map((o) => `<option value="${o[0]}" ${o[0] === s.sort ? 'selected' : ''}>${o[1]}</option>`).join('')}</select>
        <div class="view-toggle" role="group" aria-label="Layout"><button type="button" data-view="grid" aria-pressed="${view === 'grid'}" aria-label="Grid view">${D.icon('layout-grid')}</button><button type="button" data-view="list" aria-pressed="${view === 'list'}" aria-label="List view">${D.icon('list')}</button></div>
      </div>
      <p class="result-count" id="lib-count" aria-live="polite"></p>
      <div id="lib-results"></div>`;

    const results = D.$('#lib-results', el);
    const count = D.$('#lib-count', el);

    function renderResults() {
      const source = cfg.source();
      const rows = D.search.apply(source, s);
      const limit = s.page * (D.store.state.settings.pageSize || 12);
      const shown = rows.slice(0, limit);
      const v = D.store.state.settings.view;
      if (!source.length) {
        count.textContent = '';
        const e = cfg.empty || { icon: 'inbox', title: 'Nothing here yet', text: '' };
        results.innerHTML = `<div class="empty-state">${D.icon(e.icon)}<h3>${D.esc(e.title)}</h3><p>${D.esc(e.text)}</p>${e.action || ''}</div>`;
      } else if (!rows.length) {
        count.textContent = '0 results';
        results.innerHTML = `<div class="empty-state">${D.icon('search-x')}<h3>No prompts match your filters</h3><p>Try a different keyword or clear the filters.</p><button type="button" class="btn" data-clear-filters>Clear filters</button></div>`;
      } else {
        count.textContent = `Showing ${shown.length} of ${D.plural(rows.length, 'prompt')}`;
        results.innerHTML = `<div class="${v === 'list' ? 'prompt-list' : 'prompt-grid'}">${shown.map((p) => D.card(p, v, cfg.cardExtra ? cfg.cardExtra(p) : '')).join('')}</div>${rows.length > shown.length ? `<div class="load-more"><button type="button" class="btn" data-load-more>Load more (${rows.length - shown.length} left)</button></div>` : ''}`;
      }
      D.icons();
    }

    const on = (id, ev, fn) => D.$(id, el).addEventListener(ev, fn);
    on('#lib-q', 'input', D.debounce((e) => { s.q = e.target.value; s.page = 1; renderResults(); }, 120));
    on('#lib-cat', 'change', (e) => { s.cat = e.target.value; s.page = 1; renderResults(); });
    on('#lib-diff', 'change', (e) => { s.diff = e.target.value; s.page = 1; renderResults(); });
    on('#lib-sort', 'change', (e) => { s.sort = e.target.value; s.page = 1; renderResults(); });
    D.$$('[data-view]', el).forEach((b) => b.addEventListener('click', () => {
      D.store.setSetting('view', b.dataset.view);
      D.$$('[data-view]', el).forEach((x) => x.setAttribute('aria-pressed', x === b));
      renderResults();
    }));
    results.addEventListener('click', (e) => {
      if (e.target.closest('[data-load-more]')) { s.page++; renderResults(); }
      if (e.target.closest('[data-clear-filters]')) {
        s.q = ''; s.cat = ''; s.diff = ''; s.page = 1;
        D.$('#lib-q', el).value = ''; D.$('#lib-cat', el).value = ''; D.$('#lib-diff', el).value = '';
        renderResults();
      }
    });
    renderResults();
  };

  D.pages.prompts = function (el, route) {
    D.renderList(el, {
      key: 'prompts', route, title: route.params.cat || 'All Prompts',
      subtitle: route.params.cat ? 'Prompts in this category.' : `Browse the full library of ${D.store.all().length} prompts.`,
      source: () => D.store.all(),
      actions: `<button type="button" class="btn" data-act="quick-add">${D.icon('plus')} New prompt</button>`
    });
  };
})();
