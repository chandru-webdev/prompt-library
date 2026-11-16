(function () {
  'use strict';
  const D = (window.DPH = window.DPH || {});
  const PREFIX = 'dph:';

  D.storage = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(PREFIX + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); return true; }
      catch (e) { if (D.toast) D.toast.show('Could not save: browser storage is unavailable or full.', 'error'); return false; }
    },
    clearAll() {
      try { Object.keys(localStorage).filter((k) => k.indexOf(PREFIX) === 0).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* ignore */ }
    },
    bytesUsed() {
      try { return Object.keys(localStorage).filter((k) => k.indexOf(PREFIX) === 0).reduce((n, k) => n + k.length + (localStorage.getItem(k) || '').length, 0) * 2; } catch (e) { return 0; }
    }
  };

  D.uid = () => 'c-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  const S = D.storage;
  const state = {
    settings: Object.assign({ theme: 'dark', view: 'grid', pageSize: 12 }, S.get('settings', {})),
    favorites: S.get('favorites', []),
    recent: S.get('recent', []),
    usage: S.get('usage', {}),
    custom: S.get('custom', []),
    collections: S.get('collections', []),
    searches: S.get('searches', []),
    vars: S.get('vars', {}),
    history: S.get('history', {}),
    projects: S.get('projects', []),
    activeProject: S.get('activeProject', null),
    workflows: S.get('workflows', [])
  };
  if (!Array.isArray(state.favorites)) state.favorites = [];
  if (!Array.isArray(state.recent)) state.recent = [];
  if (!Array.isArray(state.custom)) state.custom = [];
  if (!Array.isArray(state.collections)) state.collections = [];
  if (!Array.isArray(state.searches)) state.searches = [];
  if (!Array.isArray(state.projects)) state.projects = [];
  if (!Array.isArray(state.workflows)) state.workflows = [];
  if (!state.history || typeof state.history !== 'object' || Array.isArray(state.history)) state.history = {};

  const save = (k) => S.set(k, state[k]);

  D.store = {
    state,
    all() { return D.PROMPTS.concat(state.custom); },
    get(id) { return D.store.all().find((p) => p.id === id) || null; },
    exists(id) { return !!D.store.get(id); },

    setSetting(k, v) { state.settings[k] = v; save('settings'); },

    isFav(id) { return state.favorites.indexOf(id) !== -1; },
    toggleFav(id) {
      const i = state.favorites.indexOf(id);
      if (i === -1) state.favorites.unshift(id); else state.favorites.splice(i, 1);
      save('favorites');
      return i === -1;
    },
    favorites() { return state.favorites.map(D.store.get).filter(Boolean); },

    markUsed(id, counted) {
      state.recent = state.recent.filter((r) => r.id !== id);
      state.recent.unshift({ id, t: Date.now() });
      state.recent = state.recent.slice(0, 30);
      save('recent');
      if (counted) { state.usage[id] = (state.usage[id] || 0) + 1; save('usage'); }
    },
    recentPrompts() { return state.recent.map((r) => D.store.get(r.id)).filter(Boolean); },
    clearRecent() { state.recent = []; save('recent'); },
    usageOf(id) { return state.usage[id] || 0; },

    customPrompts() { return state.custom; },
    addCustom(p) {
      const now = Date.now();
      const rec = Object.assign({ id: D.uid(), custom: true, added: now, rank: 0, minutes: 10, difficulty: 'Intermediate', tags: [], description: '', usage: '', example: null }, p);
      rec.custom = true;
      rec.variables = D.vars.extract(rec.content);
      state.custom.unshift(rec); save('custom');
      return rec;
    },
    updateCustom(id, patch) {
      const p = state.custom.find((c) => c.id === id);
      if (!p) return null;
      // Save the previous state as a version whenever something meaningful changes.
      const keys = ['title', 'description', 'content', 'category', 'difficulty', 'minutes', 'tags'];
      const same = (k) => patch[k] === undefined || JSON.stringify(patch[k]) === JSON.stringify(p[k]);
      if (!keys.every(same)) {
        const snap = {};
        keys.forEach((k) => { snap[k] = JSON.parse(JSON.stringify(p[k] === undefined ? null : p[k])); });
        state.history[id] = [{ t: Date.now(), snap }].concat(state.history[id] || []).slice(0, 25);
        save('history');
      }
      Object.assign(p, patch);
      p.variables = D.vars.extract(p.content);
      save('custom');
      return p;
    },
    removeCustom(id) {
      state.custom = state.custom.filter((c) => c.id !== id);
      state.favorites = state.favorites.filter((f) => f !== id);
      state.recent = state.recent.filter((r) => r.id !== id);
      state.collections.forEach((c) => { c.promptIds = c.promptIds.filter((p) => p !== id); });
      delete state.usage[id];
      delete state.history[id];
      state.workflows.forEach((w) => { w.steps = w.steps.filter((s) => s !== id); });
      ['custom', 'favorites', 'recent', 'collections', 'usage', 'history', 'workflows'].forEach(save);
    },

    collections() { return state.collections; },
    collection(id) { return state.collections.find((c) => c.id === id) || null; },
    createCollection(name) {
      const c = { id: D.uid(), name: name.trim(), promptIds: [], created: Date.now() };
      state.collections.push(c); save('collections');
      return c;
    },
    renameCollection(id, name) { const c = D.store.collection(id); if (c) { c.name = name.trim(); save('collections'); } },
    deleteCollection(id) { state.collections = state.collections.filter((c) => c.id !== id); save('collections'); },
    inCollection(cid, pid) { const c = D.store.collection(cid); return !!c && c.promptIds.indexOf(pid) !== -1; },
    addToCollection(cid, pid) { const c = D.store.collection(cid); if (c && c.promptIds.indexOf(pid) === -1) { c.promptIds.push(pid); save('collections'); } },
    removeFromCollection(cid, pid) { const c = D.store.collection(cid); if (c) { c.promptIds = c.promptIds.filter((p) => p !== pid); save('collections'); } },

    addSearch(q) {
      q = (q || '').trim();
      if (!q) return;
      state.searches = [q].concat(state.searches.filter((s) => s.toLowerCase() !== q.toLowerCase())).slice(0, 8);
      save('searches');
    },
    clearSearches() { state.searches = []; save('searches'); },

    rememberVars(values) {
      Object.keys(values).forEach((k) => { if (values[k] && /^(TECHNOLOGY|PROJECT_CONTEXT|AUDIENCE)$/.test(k)) state.vars[k] = values[k]; });
      save('vars');
    },

    history(id) { return state.history[id] || []; },
    restoreVersion(id, index) {
      const v = (state.history[id] || [])[index];
      return v ? D.store.updateCustom(id, v.snap) : null;
    },

    projects() { return state.projects; },
    project(id) { return state.projects.find((p) => p.id === id) || null; },
    saveProject(data, id) {
      const clean = {};
      ['name', 'stack', 'architecture', 'standards', 'requirements', 'notes'].forEach((k) => { clean[k] = String(data[k] || '').trim(); });
      let rec = id ? D.store.project(id) : null;
      if (rec) Object.assign(rec, clean); else { rec = Object.assign({ id: D.uid(), created: Date.now() }, clean); state.projects.push(rec); }
      save('projects');
      return rec;
    },
    deleteProject(id) {
      state.projects = state.projects.filter((p) => p.id !== id);
      if (state.activeProject === id) { state.activeProject = null; save('activeProject'); }
      save('projects');
    },
    setActiveProject(id) { state.activeProject = id || null; save('activeProject'); },
    activeProject() { return state.projects.find((p) => p.id === state.activeProject) || null; },

    workflows() { return state.workflows; },
    workflow(id) { return (D.WORKFLOWS || []).concat(state.workflows).find((w) => w.id === id) || null; },
    saveWorkflow(data, id) {
      const clean = { name: String(data.name || '').trim(), description: String(data.description || '').trim(), steps: (data.steps || []).slice() };
      let rec = id ? state.workflows.find((w) => w.id === id) : null;
      if (rec) Object.assign(rec, clean); else { rec = Object.assign({ id: D.uid() }, clean); state.workflows.push(rec); }
      save('workflows');
      return rec;
    },
    deleteWorkflow(id) { state.workflows = state.workflows.filter((w) => w.id !== id); save('workflows'); },

    resetAll() {
      S.clearAll();
      state.settings = { theme: state.settings.theme, view: 'grid', pageSize: 12 };
      state.favorites = []; state.recent = []; state.usage = {}; state.custom = []; state.collections = []; state.searches = []; state.vars = {};
      state.history = {}; state.projects = []; state.activeProject = null; state.workflows = [];
      save('settings');
    }
  };
})();
