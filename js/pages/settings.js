(function () {
  'use strict';
  const D = (window.DPH = window.DPH || {});

  const SHORTCUTS = [['Ctrl/⌘ + K', 'Open search'], ['/', 'Open search'], ['N', 'New prompt'], ['T', 'Toggle theme'], ['?', 'Show shortcuts'], ['Esc', 'Close dialog or search'], ['↑ ↓ Enter', 'Navigate search results']];
  D.SHORTCUTS = SHORTCUTS;

  D.pages.settings = function (el) {
    const st = D.store.state.settings;
    const kb = Math.max(0.1, D.storage.bytesUsed() / 1024).toFixed(1);
    el.innerHTML = `
      <div class="page-head"><div><h1>Settings</h1><p>Everything is stored locally in this browser. Nothing is sent to a server.</p></div></div>
      <section class="panel settings-group" aria-labelledby="s-app"><h2 id="s-app">Appearance & display</h2>
        <div class="settings-row"><div><p>Theme</p><p class="muted">Dark is the default.</p></div><select id="s-theme" class="select" style="width:auto" aria-label="Theme"><option value="dark" ${st.theme === 'dark' ? 'selected' : ''}>Dark</option><option value="light" ${st.theme === 'light' ? 'selected' : ''}>Light</option></select></div>
        <div class="settings-row"><div><p>Default layout</p><p class="muted">Grid or list in prompt pages.</p></div><select id="s-view" class="select" style="width:auto" aria-label="Default layout"><option value="grid" ${st.view === 'grid' ? 'selected' : ''}>Grid</option><option value="list" ${st.view === 'list' ? 'selected' : ''}>List</option></select></div>
        <div class="settings-row"><div><p>Prompts per page</p><p class="muted">How many load before “Load more”.</p></div><select id="s-size" class="select" style="width:auto" aria-label="Prompts per page">${[12, 24, 48].map((n) => `<option ${n === st.pageSize ? 'selected' : ''}>${n}</option>`).join('')}</select></div></section>
      <section class="panel settings-group" aria-labelledby="s-data"><h2 id="s-data">Your data</h2>
        <div class="settings-row"><div><p>Export everything</p><p class="muted">All prompts and collections as one JSON file.</p></div><button type="button" class="btn" data-act="export-all">${D.icon('download')} Export JSON</button></div>
        <div class="settings-row"><div><p>Import prompts</p><p class="muted">Validated before anything is saved.</p></div><button type="button" class="btn" data-act="import-json">${D.icon('upload')} Import JSON</button></div>
        <div class="settings-row"><div><p>Storage used</p><p class="muted">${kb} KB in this browser (browsers allow roughly 5 MB).</p></div></div>
        <div class="settings-row"><div><p>Reset all data</p><p class="muted">Deletes custom prompts, favorites, collections, history and preferences.</p></div><button type="button" class="btn btn-danger" data-act="reset-all">${D.icon('trash-2')} Reset</button></div></section>
      <section class="panel" aria-labelledby="s-keys"><h2 id="s-keys">Keyboard shortcuts</h2><table class="shortcut-table"><tbody>${SHORTCUTS.map((s) => `<tr><td><kbd>${D.esc(s[0])}</kbd></td><td>${D.esc(s[1])}</td></tr>`).join('')}</tbody></table></section>`;
    D.$('#s-theme', el).addEventListener('change', (e) => D.app.setTheme(e.target.value));
    D.$('#s-view', el).addEventListener('change', (e) => { D.store.setSetting('view', e.target.value); D.toast.show('Default layout saved', 'success', 1500); });
    D.$('#s-size', el).addEventListener('change', (e) => { D.store.setSetting('pageSize', Number(e.target.value)); D.toast.show('Saved', 'success', 1500); });
  };
})();
