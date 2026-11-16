(function () {
  'use strict';
  const D = (window.DPH = window.DPH || {});

  D.editor = {
    // open() creates a prompt; open(id) edits a custom prompt; open(null, {content,title,category}) pre-fills a new one.
    open(id, seed) {
      const editing = id ? D.store.get(id) : null;
      if (id && (!editing || !editing.custom)) { D.toast.show('Only custom prompts can be edited. Duplicate it first.', 'error'); return; }
      const p = editing || Object.assign({ title: '', description: '', category: D.CATEGORIES[0], difficulty: 'Intermediate', minutes: 10, tags: [], content: '' }, seed || {});
      const form = document.createElement('form');
      form.noValidate = true;
      form.className = 'editor-form';
      form.innerHTML = `
        <div class="field"><label for="ed-title">Title <span class="req">*</span></label><input id="ed-title" class="input" maxlength="120" value="${D.esc(p.title)}" required aria-describedby="ed-title-err"><p class="field-error" id="ed-title-err" role="alert"></p></div>
        <div class="field"><label for="ed-desc">Description</label><input id="ed-desc" class="input" maxlength="300" value="${D.esc(p.description)}"></div>
        <div class="field-row">
          <div class="field"><label for="ed-cat">Category</label><select id="ed-cat" class="select">${D.CATEGORIES.map((c) => `<option ${c === p.category ? 'selected' : ''}>${D.esc(c)}</option>`).join('')}</select></div>
          <div class="field"><label for="ed-diff">Difficulty</label><select id="ed-diff" class="select">${D.DIFFICULTIES.map((c) => `<option ${c === p.difficulty ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
          <div class="field"><label for="ed-min">Minutes</label><input id="ed-min" type="number" min="1" max="240" class="input" value="${p.minutes}"></div>
        </div>
        <div class="field"><label for="ed-tags">Tags <span class="muted">(comma separated)</span></label><input id="ed-tags" class="input" value="${D.esc((p.tags || []).join(', '))}"></div>
        <div class="field"><label for="ed-content">Prompt content <span class="req">*</span></label><textarea id="ed-content" class="textarea mono" rows="12" required aria-describedby="ed-content-err ed-content-hint">${D.esc(p.content)}</textarea><p class="hint" id="ed-content-hint">Use placeholders like [FEATURE] or [TECHNOLOGY]; they become fill-in fields when you copy the prompt.</p><p class="field-error" id="ed-content-err" role="alert"></p></div>`;
      const footer = `<button type="button" class="btn" data-modal-close>Cancel</button><button type="button" class="btn" data-qc>Check quality</button><button type="button" class="btn btn-primary" data-save>${editing ? 'Save changes' : 'Create prompt'}</button>`;
      const h = D.modal.open({ title: editing ? 'Edit prompt' : 'New prompt', size: 'lg', body: form, footer });
      const save = () => {
        const title = D.$('#ed-title', form).value.trim();
        const content = D.$('#ed-content', form).value.trim();
        D.$('#ed-title-err', form).textContent = title ? '' : 'Title is required.';
        D.$('#ed-content-err', form).textContent = content ? '' : 'Prompt content is required.';
        if (!title || !content) { (title ? D.$('#ed-content', form) : D.$('#ed-title', form)).focus(); return; }
        const data = {
          title, content,
          description: D.$('#ed-desc', form).value.trim(),
          category: D.$('#ed-cat', form).value,
          difficulty: D.$('#ed-diff', form).value,
          minutes: Math.min(240, Math.max(1, parseInt(D.$('#ed-min', form).value, 10) || 10)),
          tags: Array.from(new Set(D.$('#ed-tags', form).value.split(',').map((t) => t.trim().toLowerCase().replace(/^#/, '')).filter(Boolean))).slice(0, 12)
        };
        let rec;
        if (editing) rec = D.store.updateCustom(editing.id, data); else rec = D.store.addCustom(data);
        h.close(true);
        D.toast.show(editing ? 'Prompt updated' : 'Prompt created', 'success');
        D.app.refresh(true);
        if (!editing && rec) D.viewer.open(rec.id);
      };
      D.$('[data-save]', h.el).addEventListener('click', save);
      D.$('[data-qc]', h.el).addEventListener('click', () => D.quality.show(D.$('#ed-content', form).value));
      form.addEventListener('submit', (e) => { e.preventDefault(); save(); });
    }
  };
})();
