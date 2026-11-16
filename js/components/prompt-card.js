(function () {
  'use strict';
  const D = (window.DPH = window.DPH || {});

  D.diffClass = (d) => 'diff-' + String(d).toLowerCase();

  D.card = function (p, view, extra) {
    const fav = D.store.isFav(p.id);
    const tags = (p.tags || []).slice(0, 3).map((t) => `<span class="tag">#${D.esc(t)}</span>`).join('');
    return `<article class="card prompt-card" data-id="${D.esc(p.id)}">
      <div class="pc-top">
        <button type="button" class="badge badge-cat" data-act="filter-cat" data-cat="${D.esc(p.category)}" title="Show all in ${D.esc(p.category)}">${D.esc(p.category)}</button>
        <button type="button" class="btn btn-ghost btn-icon fav-btn ${fav ? 'is-fav' : ''}" data-act="fav" data-id="${D.esc(p.id)}" aria-pressed="${fav}" aria-label="${fav ? 'Remove from' : 'Add to'} favorites: ${D.esc(p.title)}">${D.icon('star')}</button>
      </div>
      <div class="pc-body">
        <h3 class="pc-title"><button type="button" class="link-btn" data-act="view" data-id="${D.esc(p.id)}">${D.esc(p.title)}</button></h3>
        <p class="pc-desc">${D.esc(p.description)}</p>
      </div>
      <div class="pc-meta">
        <span class="badge ${D.diffClass(p.difficulty)}">${D.esc(p.difficulty)}</span>
        <span class="meta">${D.icon('clock')} ~${p.minutes} min</span>
        ${p.custom ? '<span class="badge badge-custom">Custom</span>' : ''}
      </div>
      <div class="tags">${tags}</div>
      <div class="pc-actions">
        <button type="button" class="btn btn-primary btn-sm" data-act="copy" data-id="${D.esc(p.id)}">${D.icon('copy')} Copy</button>
        <button type="button" class="btn btn-sm" data-act="view" data-id="${D.esc(p.id)}">${D.icon('eye')} View details</button>
        ${extra || ''}
      </div>
    </article>`;
  };
})();
