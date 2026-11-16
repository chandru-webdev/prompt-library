(function () {
  'use strict';
  const D = (window.DPH = window.DPH || {});

  function tokens(q) { return String(q || '').toLowerCase().split(/\s+/).filter(Boolean); }

  function score(p, toks) {
    const title = p.title.toLowerCase();
    const desc = (p.description || '').toLowerCase();
    const cat = p.category.toLowerCase();
    const tags = (p.tags || []).join(' ').toLowerCase();
    const content = (p.content || '').toLowerCase();
    let total = 0;
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i];
      let s = 0;
      if (title.indexOf(t) !== -1) s += 10 + (title.indexOf(t) === 0 ? 5 : 0);
      if (tags.indexOf(t) !== -1) s += 6;
      if (cat.indexOf(t) !== -1) s += 5;
      if (desc.indexOf(t) !== -1) s += 3;
      if (content.indexOf(t) !== -1) s += 1;
      if (!s) return 0; // every word must match somewhere
      total += s;
    }
    return total;
  }

  D.search = {
    tokens,
    score,
    query(list, q) {
      const toks = tokens(q);
      if (!toks.length) return list.slice();
      return list.map((p) => ({ p, s: score(p, toks) })).filter((r) => r.s > 0).sort((a, b) => b.s - a.s).map((r) => r.p);
    },
    suggest(q, limit) { return D.search.query(D.store.all(), q).slice(0, limit || 8); },
    popularity(p) { return D.store.usageOf(p.id) * 1000 + (p.rank || 0); },
    apply(list, f) {
      const toks = tokens(f.q);
      let rows = list.map((p) => ({ p, s: toks.length ? score(p, toks) : 1 }));
      if (toks.length) rows = rows.filter((r) => r.s > 0);
      if (f.cat) rows = rows.filter((r) => r.p.category === f.cat);
      if (f.diff) rows = rows.filter((r) => r.p.difficulty === f.diff);
      const cmp = {
        relevance: (a, b) => (b.s - a.s) || (b.p.added - a.p.added),
        newest: (a, b) => b.p.added - a.p.added,
        popular: (a, b) => D.search.popularity(b.p) - D.search.popularity(a.p),
        alpha: (a, b) => a.p.title.localeCompare(b.p.title)
      }[f.sort || 'relevance'];
      return rows.sort(cmp).map((r) => r.p);
    }
  };
})();
