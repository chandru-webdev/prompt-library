(function () {
  'use strict';
  const D = (window.DPH = window.DPH || {});
  let root = null, active = -1, items = [], lastOpener = null;

  function results(q) {
    if (!q.trim()) return [];
    return D.search.suggest(q, 8);
  }

  function draw() {
    const q = D.$('#pal-input', root).value;
    const list = D.$('#pal-list', root);
    items = [];
    let html = '';
    if (!q.trim()) {
      const recents = D.store.state.searches;
      if (recents.length) {
        html += `<div class="pal-group"><span>Recent searches</span><button type="button" class="link-btn small" data-pal-clear>Clear</button></div>`;
        recents.forEach((s) => { items.push({ type: 'search', q: s }); html += `<button type="button" role="option" class="pal-item" data-i="${items.length - 1}">${D.icon('history')}<span>${D.esc(s)}</span></button>`; });
      } else {
        html += `<div class="pal-empty">${D.icon('search')}<p>Search ${D.store.all().length} prompts by title, description, content, tag or category.</p><p class="muted">Try "jwt", "docker" or "review".</p></div>`;
      }
    } else {
      const res = results(q);
      if (!res.length) {
        html += `<div class="pal-empty">${D.icon('search-x')}<p>No prompts match "${D.esc(q)}".</p><p class="muted">Check the spelling or try a broader term.</p></div>`;
      } else {
        html += `<div class="pal-group"><span>Prompts</span></div>`;
        res.forEach((p) => { items.push({ type: 'prompt', id: p.id }); html += `<button type="button" role="option" class="pal-item" data-i="${items.length - 1}">${D.icon('file-text')}<span class="pal-title">${D.esc(p.title)}</span><span class="pal-cat">${D.esc(p.category)}</span></button>`; });
        const total = D.search.query(D.store.all(), q).length;
        items.push({ type: 'all', q });
        html += `<button type="button" role="option" class="pal-item pal-all" data-i="${items.length - 1}">${D.icon('arrow-right')}<span>View all ${total} result${total === 1 ? '' : 's'} in the library</span></button>`;
      }
    }
    list.innerHTML = html;
    D.icons();
    setActive(items.length ? 0 : -1);
  }

  function setActive(i) {
    active = i;
    D.$$('.pal-item', root).forEach((el) => {
      const on = Number(el.dataset.i) === i;
      el.classList.toggle('active', on);
      el.setAttribute('aria-selected', on);
      if (on) { D.$('#pal-input', root).setAttribute('aria-activedescendant', ''); el.scrollIntoView && el.scrollIntoView({ block: 'nearest' }); }
    });
  }

  function choose(i) {
    const it = items[i];
    const q = D.$('#pal-input', root).value;
    if (!it) { if (q.trim()) { D.store.addSearch(q); close(); location.hash = '#/prompts?q=' + encodeURIComponent(q.trim()); } return; }
    if (it.type === 'prompt') { D.store.addSearch(q); close(); D.viewer.open(it.id); }
    else if (it.type === 'search') { D.$('#pal-input', root).value = it.q; draw(); }
    else if (it.type === 'all') { D.store.addSearch(it.q); close(); location.hash = '#/prompts?q=' + encodeURIComponent(it.q); }
  }

  function close() {
    if (!root) return;
    root.remove(); root = null;
    document.body.classList.remove('no-scroll');
    if (lastOpener && document.contains(lastOpener)) lastOpener.focus();
  }

  D.palette = {
    isOpen() { return !!root; },
    open() {
      if (root) { D.$('#pal-input', root).focus(); return; }
      D.modal.closeAll();
      lastOpener = document.activeElement;
      root = document.createElement('div');
      root.className = 'modal-backdrop pal-backdrop';
      root.innerHTML = `<div class="palette" role="dialog" aria-modal="true" aria-label="Search prompts">
        <div class="pal-input-wrap">${D.icon('search')}<input id="pal-input" class="pal-input" type="text" role="combobox" aria-expanded="true" aria-controls="pal-list" autocomplete="off" spellcheck="false" placeholder="Search prompts, tags, technologies…"><kbd>Esc</kbd></div>
        <div id="pal-list" class="pal-list" role="listbox" aria-label="Results"></div>
        <div class="pal-foot"><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span></div></div>`;
      D.$('#modal-root').appendChild(root);
      document.body.classList.add('no-scroll');
      const input = D.$('#pal-input', root);
      input.focus();
      draw();
      input.addEventListener('input', D.debounce(draw, 60));
      input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); if (items.length) setActive((active + 1) % items.length); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); if (items.length) setActive((active - 1 + items.length) % items.length); }
        else if (e.key === 'Enter') { e.preventDefault(); choose(active); }
        else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
        else if (e.key === 'Tab') { e.preventDefault(); }
      });
      root.addEventListener('mousedown', (e) => { if (e.target === root) close(); });
      root.addEventListener('click', (e) => {
        if (e.target.closest('[data-pal-clear]')) { D.store.clearSearches(); draw(); return; }
        const b = e.target.closest('.pal-item');
        if (b) choose(Number(b.dataset.i));
      });
      root.addEventListener('mousemove', (e) => { const b = e.target.closest('.pal-item'); if (b && Number(b.dataset.i) !== active) setActive(Number(b.dataset.i)); });
    },
    close
  };
})();
