(function () {
  'use strict';
  const D = (window.DPH = window.DPH || {});

  const NAV = [
    ['dashboard', 'layout-dashboard', 'Dashboard'],
    ['prompts', 'library', 'All Prompts', 'all'],
    ['favorites', 'star', 'Favorites', 'fav'],
    ['recent', 'history', 'Recently Used'],
    ['collections', 'folder-kanban', 'My Collections', 'col'],
    ['custom', 'pencil-line', 'Custom Prompts', 'custom'],
    ['builder', 'wand-sparkles', 'Prompt Builder'],
    ['workflows', 'workflow', 'Workflow Chains'],
    ['projects', 'briefcase', 'Project Contexts'],
    ['rules', 'file-cog', 'Agent Rules'],
    ['quality', 'gauge', 'Quality Checker'],
    ['tools', 'wrench', 'Developer Tools'],
    ['settings', 'settings', 'Settings']
  ];

  D.sidebar = {
    render(route) {
      const el = D.$('#sidebar');
      if (!el) return;
      const all = D.store.all();
      const counts = { all: all.length, fav: D.store.state.favorites.length, col: D.store.collections().length, custom: D.store.customPrompts().length };
      const byCat = {};
      all.forEach((p) => { byCat[p.category] = (byCat[p.category] || 0) + 1; });
      const activeCat = route.name === 'prompts' ? (route.params.cat || '') : null;
      const nav = NAV.map((n) => {
        const active = route.name === n[0] && !(n[0] === 'prompts' && activeCat);
        return `<li><a class="nav-link ${active ? 'active' : ''}" href="#/${n[0]}" ${active ? 'aria-current="page"' : ''}>${D.icon(n[1])}<span>${n[2]}</span>${n[3] && counts[n[3]] != null ? `<span class="count">${counts[n[3]]}</span>` : ''}</a></li>`;
      }).join('');
      const cats = D.CATEGORIES.filter((c) => byCat[c]).map((c) => `<li><a class="nav-link nav-cat ${activeCat === c ? 'active' : ''}" href="#/prompts?cat=${encodeURIComponent(c)}" ${activeCat === c ? 'aria-current="page"' : ''}><span class="dot"></span><span>${D.esc(c)}</span><span class="count">${byCat[c]}</span></a></li>`).join('');
      el.innerHTML = `<div class="brand"><a href="#/dashboard" class="brand-link" aria-label="Dev Prompt Hub home"><span class="brand-mark">${D.icon('terminal-square')}</span><span class="brand-name">Dev Prompt Hub</span></a><button type="button" class="btn btn-ghost btn-icon sidebar-close" data-act="close-sidebar" aria-label="Close menu">${D.icon('x')}</button></div>
        <nav aria-label="Main"><ul class="nav-list">${nav}</ul></nav>
        <div class="nav-heading" id="cat-heading">Categories</div>
        <nav aria-labelledby="cat-heading" class="cat-nav"><ul class="nav-list">${cats}</ul></nav>`;
      D.icons();
    }
  };
})();
