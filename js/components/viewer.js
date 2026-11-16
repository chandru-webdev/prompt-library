(function () {
  'use strict';
  const D = (window.DPH = window.DPH || {});

  function copyWithCheck(p, text, vars) {
    const missing = D.vars.unresolved(text);
    const doCopy = () => D.clipboard.copy(text).then((ok) => {
      if (ok) { D.store.markUsed(p.id, true); D.toast.show('Prompt copied to clipboard', 'success'); if (vars) D.store.rememberVars(vars); D.app && D.app.refresh(true); }
      else D.toast.show('Copy failed. Select the text and copy manually.', 'error');
    });
    if (!missing.length) return doCopy();
    return D.modal.confirm({
      title: 'Unresolved placeholders',
      message: `This prompt still contains ${missing.length} unfilled placeholder${missing.length === 1 ? '' : 's'}: ${missing.map((m) => '[' + m + ']').join(', ')}. Copy anyway?`,
      confirmText: 'Copy anyway'
    }).then((ok) => { if (ok) doCopy(); });
  }

  D.actions = {
    copy(id) {
      const p = D.store.get(id);
      if (!p) return;
      const vars = D.vars.extract(p.content);
      if (vars.length) { D.viewer.open(id, { focusForm: true }); return; }
      copyWithCheck(p, p.content);
    },
    duplicate(id) {
      const p = D.store.get(id);
      if (!p) return;
      const rec = D.store.addCustom({ title: p.title + ' (copy)', description: p.description, category: p.category, difficulty: p.difficulty, minutes: p.minutes, tags: (p.tags || []).slice(), content: p.content });
      D.toast.show('Duplicated as a custom prompt', 'success');
      D.app.refresh(true);
      return rec;
    },
    remove(id) {
      const p = D.store.get(id);
      if (!p || !p.custom) return Promise.resolve(false);
      return D.modal.confirm({ title: 'Delete prompt?', message: `"${p.title}" will be permanently deleted from this browser.`, confirmText: 'Delete', danger: true }).then((ok) => {
        if (ok) { D.store.removeCustom(id); D.toast.show('Prompt deleted', 'success'); D.app.refresh(true); }
        return ok;
      });
    }
  };

  D.actions.copyFilled = copyWithCheck;

  D.collectionsPicker = function (pid) {
    const p = D.store.get(pid);
    if (!p) return;
    const body = document.createElement('div');
    const draw = () => {
      const cols = D.store.collections();
      body.innerHTML = `${cols.length ? '<ul class="check-list">' + cols.map((c) => `<li><label><input type="checkbox" data-cid="${c.id}" ${D.store.inCollection(c.id, pid) ? 'checked' : ''}> <span>${D.esc(c.name)}</span> <span class="muted">${c.promptIds.length}</span></label></li>`).join('') + '</ul>' : '<p class="muted">No collections yet. Create your first one below.</p>'}
        <form class="inline-form" data-new><label class="sr-only" for="newcol">New collection name</label><input id="newcol" class="input" maxlength="60" placeholder="New collection name" required><button class="btn btn-primary" type="submit">${D.icon('plus')} Create</button></form>`;
      D.icons();
    };
    draw();
    body.addEventListener('change', (e) => {
      const cb = e.target.closest('[data-cid]');
      if (!cb) return;
      if (cb.checked) D.store.addToCollection(cb.dataset.cid, pid); else D.store.removeFromCollection(cb.dataset.cid, pid);
      D.toast.show(cb.checked ? 'Added to collection' : 'Removed from collection', 'success', 1800);
      D.app.refresh(true);
    });
    body.addEventListener('submit', (e) => {
      e.preventDefault();
      const inp = D.$('#newcol', body);
      const name = inp.value.trim();
      if (!name) return;
      if (D.store.collections().some((c) => c.name.toLowerCase() === name.toLowerCase())) { D.toast.show('A collection with that name already exists', 'error'); return; }
      const c = D.store.createCollection(name);
      D.store.addToCollection(c.id, pid);
      D.toast.show('Collection created', 'success');
      draw(); D.app.refresh(true);
    });
    D.modal.open({ title: 'Save to collections', size: 'sm', body, footer: '<button class="btn btn-primary" data-modal-close>Done</button>' });
  };

  D.viewer = {
    open(id, opts) {
      const p = D.store.get(id);
      if (!p) { D.toast.show('That prompt no longer exists', 'error'); return; }
      D.store.markUsed(id, false);
      const names = D.vars.extract(p.content);
      const stored = D.store.state.vars || {};
      const values = {};
      names.forEach((n) => { values[n] = stored[n] || ''; });
      const related = D.store.all().filter((x) => x.id !== p.id && x.category === p.category).slice(0, 4);
      if (related.length < 4) D.store.all().filter((x) => x.id !== p.id && related.indexOf(x) === -1 && (x.tags || []).some((t) => (p.tags || []).indexOf(t) !== -1)).slice(0, 4 - related.length).forEach((x) => related.push(x));
      const example = p.example ? names.filter((n) => p.example[n]).map((n) => `<dt>[${n}]</dt><dd>${D.esc(p.example[n])}</dd>`).join('') : '';

      const body = document.createElement('div');
      body.className = 'viewer';
      body.innerHTML = `
        <div class="viewer-meta">
          <span class="badge badge-cat">${D.esc(p.category)}</span>
          <span class="badge ${D.diffClass(p.difficulty)}">${D.esc(p.difficulty)}</span>
          <span class="meta">${D.icon('clock')} ~${p.minutes} min</span>
          ${p.custom ? '<span class="badge badge-custom">Custom</span>' : ''}
          ${(p.tags || []).map((t) => `<span class="tag">#${D.esc(t)}</span>`).join('')}
        </div>
        ${p.description ? `<p class="viewer-desc">${D.esc(p.description)}</p>` : ''}
        <div class="viewer-grid ${names.length ? '' : 'single'}">
          <section aria-labelledby="v-prompt">
            <div class="section-head"><h3 id="v-prompt">Prompt</h3><span class="badge" data-unresolved></span></div>
            <pre class="prompt-pre" tabindex="0" aria-label="Prompt text" data-preview></pre>
          </section>
          ${names.length ? `<section aria-labelledby="v-vars"><div class="section-head"><h3 id="v-vars">Fill in variables</h3><button type="button" class="btn btn-ghost btn-sm" data-example>${D.icon('lightbulb')} Use example</button></div>
            ${D.projectPicker ? D.projectPicker({ label: 'Fill from a saved project' }) : ''}<form class="var-form" data-form onsubmit="return false">${names.map((n) => `<div class="field"><label for="var-${n}">${D.vars.label(n)} <code>[${n}]</code></label><textarea id="var-${n}" class="textarea" rows="2" data-var="${n}" placeholder="${D.esc(D.vars.hint(n))}">${D.esc(values[n])}</textarea></div>`).join('')}</form></section>` : ''}
        </div>
        <details class="disclosure" open><summary>Usage instructions</summary><p>${D.esc(p.usage || 'Copy this prompt, paste it into your AI assistant, and attach any code or files it asks for. Review the output before using it.')}</p></details>
        ${example ? `<details class="disclosure"><summary>Example usage</summary><dl class="example-list">${example}</dl></details>` : ''}
        ${related.length ? `<section class="related"><h3>Related prompts</h3><div class="chip-row">${related.map((r) => `<button type="button" class="chip" data-related="${D.esc(r.id)}">${D.esc(r.title)}</button>`).join('')}</div></section>` : ''}`;

      const fav = D.store.isFav(id);
      const footer = document.createElement('div');
      footer.className = 'viewer-actions';
      footer.innerHTML = `
        <button type="button" class="btn btn-primary" data-copy>${D.icon('copy')} Copy prompt</button>
        <button type="button" class="btn" data-fav aria-pressed="${fav}">${D.icon('star')} <span>${fav ? 'Favorited' : 'Favorite'}</span></button>
        <button type="button" class="btn" data-col>${D.icon('folder-plus')} Collections</button>
        <button type="button" class="btn" data-export="txt">${D.icon('file-text')} TXT</button>
        <button type="button" class="btn" data-export="md">${D.icon('file-code')} Markdown</button>
        ${p.custom ? `<button type="button" class="btn" data-edit>${D.icon('pencil')} Edit</button>` : ''}
        <button type="button" class="btn" data-qc>${D.icon('gauge')} Check quality</button>
        ${p.custom ? `<button type="button" class="btn" data-hist>${D.icon('history')} History</button>` : ''}
        <button type="button" class="btn" data-dup>${D.icon('copy-plus')} Duplicate</button>
        ${p.custom ? `<button type="button" class="btn btn-danger" data-del>${D.icon('trash-2')} Delete</button>` : ''}`;

      const h = D.modal.open({ title: p.title, size: 'lg', className: 'viewer-modal', body, footer });
      const preview = D.$('[data-preview]', body);
      const badge = D.$('[data-unresolved]', body);

      const resolved = () => D.vars.fill(p.content, values);
      const renderPreview = () => {
        const text = resolved();
        const missing = D.vars.unresolved(text);
        preview.innerHTML = D.esc(text).replace(/\[([A-Z][A-Z0-9_]{1,40})\]/g, '<mark class="ph">[$1]</mark>');
        badge.textContent = names.length ? (missing.length ? `${missing.length} unresolved` : 'All variables filled') : 'No variables';
        badge.className = 'badge ' + (missing.length ? 'badge-warn' : 'badge-ok');
      };
      renderPreview();

      body.addEventListener('input', (e) => {
        const t = e.target.closest('[data-var]');
        if (!t) return;
        values[t.dataset.var] = t.value;
        renderPreview();
      });
      body.addEventListener('click', (e) => {
        if (e.target.closest('[data-example]') && p.example) {
          names.forEach((n) => { if (p.example[n]) { values[n] = p.example[n]; D.$('#var-' + n, body).value = p.example[n]; } });
          renderPreview();
        }
        const rel = e.target.closest('[data-related]');
        if (rel) { h.close(); D.viewer.open(rel.dataset.related); }
      });
      body.addEventListener('change', (e) => {
        const s = e.target.closest('[data-project]');
        if (!s) return;
        const proj = D.store.project(s.value);
        if (!proj) return;
        const vals = D.projectValues(proj);
        let n = 0;
        names.forEach((k) => { if (vals[k]) { values[k] = vals[k]; const f = D.$('#var-' + k, body); if (f) f.value = vals[k]; n++; } });
        renderPreview();
        D.toast.show(n ? `Filled ${D.plural(n, 'variable')} from "${proj.name}"` : 'This prompt has no variables the project can fill', 'info', 2200);
      });
      footer.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.hasAttribute('data-copy')) copyWithCheck(p, resolved(), values);
        else if (b.hasAttribute('data-fav')) {
          const on = D.store.toggleFav(id);
          b.setAttribute('aria-pressed', on); D.$('span', b).textContent = on ? 'Favorited' : 'Favorite';
          D.toast.show(on ? 'Added to favorites' : 'Removed from favorites', 'success', 1800);
          D.app.refresh(true);
        }
        else if (b.hasAttribute('data-col')) D.collectionsPicker(id);
        else if (b.dataset.export) { D.exporter.exportPrompt(p, b.dataset.export, resolved()); D.toast.show('Download started', 'success', 1800); }
        else if (b.hasAttribute('data-edit')) { h.close(); D.editor.open(id); }
        else if (b.hasAttribute('data-qc')) D.quality.show(resolved());
        else if (b.hasAttribute('data-hist')) D.history.open(id);
        else if (b.hasAttribute('data-dup')) { const rec = D.actions.duplicate(id); if (rec) { h.close(); D.viewer.open(rec.id); } }
        else if (b.hasAttribute('data-del')) D.actions.remove(id).then((ok) => { if (ok) h.close(); });
      });
      if (opts && opts.focusForm) { const f = D.$('[data-var]', body); if (f) f.focus(); }
      return h;
    }
  };
})();
