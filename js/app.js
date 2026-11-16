(function () {
  'use strict';
  const D = (window.DPH = window.DPH || {});
  let rendering = false;

  function parseRoute() {
    const raw = location.hash.replace(/^#\/?/, '');
    const qi = raw.indexOf('?');
    const path = qi === -1 ? raw : raw.slice(0, qi);
    const params = {};
    new URLSearchParams(qi === -1 ? '' : raw.slice(qi + 1)).forEach((v, k) => { params[k] = v; });
    const parts = path.split('/').filter(Boolean).map((p) => { try { return decodeURIComponent(p); } catch (e) { return p; } });
    return { name: parts[0] || 'dashboard', parts, params, hash: location.hash || '#/dashboard' };
  }

  const TITLES = { dashboard: 'Dashboard', prompts: 'All Prompts', favorites: 'Favorites', recent: 'Recently Used', collections: 'My Collections', custom: 'Custom Prompts', builder: 'Prompt Builder', workflows: 'Workflow Chains', projects: 'Project Contexts', rules: 'Agent Rules', quality: 'Quality Checker', tools: 'Developer Tools', settings: 'Settings' };

  const NOTIFS = () => [
    ['library', `Library ready: ${D.PROMPTS.length} prompts`, `${D.PROMPTS.length} built-in prompts across ${D.CATEGORIES.length} categories, plus any you add.`],
    ['hard-drive', 'Your data stays on this device', 'Favorites, collections and custom prompts live in browser storage. Export a JSON backup from Settings now and then.'],
    ['wrench', '20 developer tools included', 'Format JSON, decode JWTs, test regexes and more, entirely offline in your browser.'],
    ['keyboard', 'Press Ctrl+K to search', 'Search titles, descriptions, content and tags from anywhere.']
  ];
  const NOTIF_VERSION = '1';

  D.app = {
    route: null,
    refresh(keepScroll) { render(keepScroll !== false); },
    setTheme(t) {
      document.documentElement.setAttribute('data-theme', t);
      D.store.setSetting('theme', t);
      const sel = D.$('#s-theme'); if (sel) sel.value = t;
    },
    toggleTheme() { D.app.setTheme(D.store.state.settings.theme === 'dark' ? 'light' : 'dark'); }
  };

  function render(keepScroll) {
    if (rendering) return;
    rendering = true;
    const route = parseRoute();
    D.app.route = route;
    const view = D.$('#view');
    const y = window.scrollY;
    const focused = document.activeElement && document.activeElement.dataset ? { act: document.activeElement.dataset.act, id: document.activeElement.dataset.id } : null;
    const page = D.pages[route.name];
    try {
      if (!page) {
        view.innerHTML = `<div class="empty-state">${D.icon('compass')}<h3>Page not found</h3><p>That address does not exist.</p><a class="btn btn-primary" href="#/dashboard">Go to dashboard</a></div>`;
        document.title = 'Not found · Dev Prompt Hub';
      } else {
        page(view, route);
        document.title = (route.name === 'prompts' && route.params.cat ? route.params.cat : TITLES[route.name] || 'Dev Prompt Hub') + ' · Dev Prompt Hub';
      }
    } catch (err) {
      if (window.console) console.error(err);
      view.innerHTML = `<div class="empty-state error-state">${D.icon('alert-triangle')}<h3>Something went wrong</h3><p>${D.esc(err && err.message ? err.message : 'Unexpected error')}</p><button type="button" class="btn" data-act="retry">Try again</button></div>`;
    }
    D.sidebar.render(route);
    D.icons();
    if (keepScroll) {
      window.scrollTo(0, y);
      if (focused && focused.act) { const n = D.$(`[data-act="${focused.act}"]${focused.id ? `[data-id="${CSS.escape(focused.id)}"]` : ''}`, view); if (n) n.focus({ preventScroll: true }); }
    }
    rendering = false;
  }

  function closeSidebar() { document.body.classList.remove('sidebar-open'); }

  function openNotifications() {
    D.modal.open({ title: 'Notifications', size: 'sm', body: '<ul class="notif-list">' + NOTIFS().map((n) => `<li>${D.icon(n[0])}<div><strong>${D.esc(n[1])}</strong><p>${D.esc(n[2])}</p></div></li>`).join('') + '</ul>', footer: '<button class="btn btn-primary" data-modal-close>Close</button>' });
    D.storage.set('notifSeen', NOTIF_VERSION);
    const dot = D.$('#notif-dot'); if (dot) dot.hidden = true;
  }

  function showShortcuts() {
    D.modal.open({ title: 'Keyboard shortcuts', size: 'sm', body: `<table class="shortcut-table"><tbody>${D.SHORTCUTS.map((s) => `<tr><td><kbd>${D.esc(s[0])}</kbd></td><td>${D.esc(s[1])}</td></tr>`).join('')}</tbody></table>`, footer: '<button class="btn btn-primary" data-modal-close>Close</button>' });
  }

  const handlers = {
    'open-sidebar': () => { document.body.classList.add('sidebar-open'); const l = D.$('#sidebar .nav-link'); if (l) l.focus(); },
    'close-sidebar': closeSidebar,
    'open-search': () => D.palette.open(),
    'quick-add': () => D.editor.open(),
    'toggle-theme': () => D.app.toggleTheme(),
    notifications: openNotifications,
    retry: () => render(false),
    fav: (t) => { const on = D.store.toggleFav(t.dataset.id); D.toast.show(on ? 'Added to favorites' : 'Removed from favorites', 'success', 1600); render(true); },
    copy: (t) => D.actions.copy(t.dataset.id),
    view: (t) => D.viewer.open(t.dataset.id),
    'filter-cat': (t) => { location.hash = '#/prompts?cat=' + encodeURIComponent(t.dataset.cat); },
    'clear-recent': () => D.modal.confirm({ title: 'Clear history?', message: 'Your recently used list will be emptied. Favorites and collections are not affected.', confirmText: 'Clear' }).then((ok) => { if (ok) { D.store.clearRecent(); D.toast.show('History cleared', 'success', 1800); render(true); } }),
    'import-json': () => D.exporter.pickFileAndImport(() => render(true)),
    'export-custom': () => { if (!D.store.customPrompts().length) { D.toast.show('You have no custom prompts to export', 'error'); return; } D.exporter.exportCustomJSON(); D.toast.show('Export downloaded', 'success', 1800); },
    'export-all': () => { D.exporter.exportAllJSON(); D.toast.show('Export downloaded', 'success', 1800); },
    'col-new': () => D.collectionDialog(null),
    'col-rename': (t) => D.collectionDialog(D.store.collection(t.dataset.cid)),
    'col-export': (t) => { const c = D.store.collection(t.dataset.cid); if (c) { D.exporter.exportCollections([c]); D.toast.show('Export downloaded', 'success', 1800); } },
    'col-export-all': () => { D.exporter.exportCollections(D.store.collections()); D.toast.show('Export downloaded', 'success', 1800); },
    'col-delete': (t) => { const c = D.store.collection(t.dataset.cid); if (!c) return; D.modal.confirm({ title: 'Delete collection?', message: `"${c.name}" will be deleted. The prompts inside are not deleted.`, confirmText: 'Delete', danger: true }).then((ok) => { if (ok) { D.store.deleteCollection(c.id); D.toast.show('Collection deleted', 'success', 1800); if (D.app.route.parts[1]) location.hash = '#/collections'; else render(true); } }); },
    'col-remove': (t) => { D.store.removeFromCollection(t.dataset.cid, t.dataset.id); D.toast.show('Removed from collection', 'success', 1600); render(true); },
    'reset-all': () => D.modal.confirm({ title: 'Reset all data?', message: 'This permanently deletes your custom prompts, favorites, collections, history and preferences from this browser.', confirmText: 'Delete everything', danger: true }).then((ok) => { if (ok) { D.store.resetAll(); D.toast.show('All data was reset', 'success'); location.hash = '#/dashboard'; render(false); } })
  };

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-act]');
    if (t && handlers[t.dataset.act]) { e.preventDefault(); handlers[t.dataset.act](t); return; }
    if (e.target.closest('#sidebar a')) closeSidebar();
  });

  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (D.palette.isOpen()) D.palette.close(); else D.palette.open(); return; }
    if (typing || e.ctrlKey || e.metaKey || e.altKey || D.modal.count() || D.palette.isOpen()) return;
    if (e.key === '/') { e.preventDefault(); D.palette.open(); }
    else if (e.key === 'n' || e.key === 'N') { e.preventDefault(); D.editor.open(); }
    else if (e.key === 't' || e.key === 'T') { D.app.toggleTheme(); }
    else if (e.key === '?') { showShortcuts(); }
    else if (e.key === 'Escape') closeSidebar();
  });

  window.addEventListener('hashchange', () => { closeSidebar(); render(false); window.scrollTo(0, 0); const v = D.$('#view'); if (v) v.focus({ preventScroll: true }); });

  function boot() {
    document.documentElement.setAttribute('data-theme', D.store.state.settings.theme === 'light' ? 'light' : 'dark');
    const dot = D.$('#notif-dot');
    if (dot) dot.hidden = D.storage.get('notifSeen', null) === NOTIF_VERSION;
    render(false);
    // Lucide loads with `defer`; re-draw icons once it is ready.
    window.addEventListener('load', () => D.icons());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
