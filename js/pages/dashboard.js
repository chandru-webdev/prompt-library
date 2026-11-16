(function () {
  'use strict';
  const D = (window.DPH = window.DPH || {});

  function miniList(list, empty) {
    if (!list.length) return `<p class="muted">${empty}</p>`;
    return '<ul class="mini-list">' + list.map((p) => `<li><span class="mi-main"><button type="button" class="link-btn mi-title" data-act="view" data-id="${D.esc(p.id)}">${D.esc(p.title)}</button><span class="mi-sub">${D.esc(p.category)} · ${D.esc(p.difficulty)}</span></span><button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="copy" data-id="${D.esc(p.id)}" aria-label="Copy ${D.esc(p.title)}">${D.icon('copy')}</button></li>`).join('') + '</ul>';
  }

  D.pages.dashboard = function (el) {
    const all = D.store.all();
    const favs = D.store.favorites();
    const recent = D.store.recentPrompts();
    const custom = D.store.customPrompts();
    const stats = [
      ['library', all.length, 'Total prompts', '#/prompts'],
      ['star', favs.length, 'Favorite prompts', '#/favorites'],
      ['history', recent.length, 'Recently used', '#/recent'],
      ['pencil-line', custom.length, 'Custom prompts', '#/custom']
    ].map((s) => `<a class="card stat" href="${s[3]}"><span class="stat-icon">${D.icon(s[0])}</span><span><span class="stat-num">${s[1]}</span><br><span class="stat-label">${s[2]}</span></span></a>`).join('');

    // Most-used categories: by copies; falls back to library size until the user has usage.
    const used = {};
    all.forEach((p) => { const n = D.store.usageOf(p.id); if (n) used[p.category] = (used[p.category] || 0) + n; });
    const hasUsage = Object.keys(used).length > 0;
    const sizes = {};
    all.forEach((p) => { sizes[p.category] = (sizes[p.category] || 0) + 1; });
    const source = hasUsage ? used : sizes;
    const rows = Object.keys(source).sort((a, b) => source[b] - source[a] || a.localeCompare(b)).slice(0, 7);
    const max = source[rows[0]] || 1;
    const cats = rows.map((c) => `<li class="bar-row"><a href="#/prompts?cat=${encodeURIComponent(c)}">${D.esc(c)}</a><span class="n">${source[c]}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.round(source[c] / max * 100)}%"></div></div></li>`).join('');

    const added = all.slice().sort((a, b) => b.added - a.added).slice(0, 5);
    const quick = D.QUICK_START.map(D.store.get).filter(Boolean);

    el.innerHTML = `
      <div class="page-head"><div><h1>Dashboard</h1><p>Find, fill in and copy high-quality prompts for every stage of development.</p></div>
        <div class="page-actions"><button type="button" class="btn" data-act="open-search">${D.icon('search')} Search</button><a class="btn btn-primary" href="#/builder">${D.icon('wand-sparkles')} Prompt Builder</a></div></div>
      <div class="stat-grid">${stats}</div>
      <section class="dash-section" aria-labelledby="qs"><div class="panel-head"><h2 id="qs">Quick Start</h2><a href="#/prompts" class="btn btn-ghost btn-sm">Browse all ${D.icon('arrow-right')}</a></div>
        <div class="prompt-grid">${quick.map((p) => D.card(p, 'grid')).join('')}</div></section>
      <div class="dash-cols">
        <section class="panel" aria-labelledby="mu"><div class="panel-head"><h2 id="mu">${hasUsage ? 'Most-used categories' : 'Largest categories'}</h2></div>
          ${hasUsage ? '' : '<p class="muted small">Copy a few prompts and this chart will show your most-used categories.</p>'}
          <ul class="bar-list">${cats}</ul></section>
        <section class="panel" aria-labelledby="ra"><div class="panel-head"><h2 id="ra">Recently added</h2></div>${miniList(added, 'Nothing here yet.')}</section>
      </div>
      <section class="panel" aria-labelledby="ru"><div class="panel-head"><h2 id="ru">Recently used</h2>${recent.length ? '<a href="#/recent" class="btn btn-ghost btn-sm">See all</a>' : ''}</div>${miniList(recent.slice(0, 5), 'Prompts you open or copy will appear here.')}</section>`;
  };
})();
