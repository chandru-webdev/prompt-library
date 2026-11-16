(function () {
  'use strict';
  const D = (window.DPH = window.DPH || {});
  const MAX_TITLE = 200, MAX_CONTENT = 50000, MAX_ITEMS = 2000;

  function slugName(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'prompt'; }

  D.exporter = {
    download(filename, text, mime) {
      const blob = new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    toText(p, content) { return (content != null ? content : p.content) + '\n'; },
    toMarkdown(p, content) {
      const meta = [`**Category:** ${p.category}`, `**Difficulty:** ${p.difficulty}`, `**Estimated time:** ${p.minutes} min`];
      if (p.tags && p.tags.length) meta.push(`**Tags:** ${p.tags.join(', ')}`);
      return `# ${p.title}\n\n${p.description || ''}\n\n${meta.join('  \n')}\n\n## Prompt\n\n\`\`\`text\n${content != null ? content : p.content}\n\`\`\`\n`;
    },
    exportPrompt(p, fmt, content) {
      const name = slugName(p.title);
      if (fmt === 'md') D.exporter.download(name + '.md', D.exporter.toMarkdown(p, content), 'text/markdown');
      else D.exporter.download(name + '.txt', D.exporter.toText(p, content), 'text/plain');
    },
    bundle(prompts, collections) {
      return {
        app: 'dev-prompt-hub', version: 1, exportedAt: new Date().toISOString(),
        prompts: prompts.map((p) => ({ id: p.id, title: p.title, description: p.description, category: p.category, difficulty: p.difficulty, minutes: p.minutes, tags: p.tags, content: p.content, custom: !!p.custom })),
        collections: (collections || []).map((c) => ({ id: c.id, name: c.name, promptIds: c.promptIds }))
      };
    },
    exportAllJSON() {
      const data = D.exporter.bundle(D.store.all(), D.store.collections());
      D.exporter.download('dev-prompt-hub-all-prompts.json', JSON.stringify(data, null, 2), 'application/json');
    },
    exportCustomJSON() {
      const data = D.exporter.bundle(D.store.customPrompts(), D.store.collections());
      D.exporter.download('dev-prompt-hub-custom-prompts.json', JSON.stringify(data, null, 2), 'application/json');
    },
    exportCollections(list) {
      const prompts = [];
      const seen = {};
      list.forEach((c) => c.promptIds.forEach((id) => { const p = D.store.get(id); if (p && !seen[id]) { seen[id] = 1; prompts.push(p); } }));
      D.exporter.download('dev-prompt-hub-collections.json', JSON.stringify(D.exporter.bundle(prompts, list), null, 2), 'application/json');
    },

    // Validates untrusted JSON; never throws. Returns {valid, collections, errors, skipped}.
    validateImport(text) {
      const res = { valid: [], collections: [], errors: [], skipped: 0 };
      let data;
      try { data = JSON.parse(text); } catch (e) { res.errors.push('File is not valid JSON: ' + e.message); return res; }
      const list = Array.isArray(data) ? data : (data && Array.isArray(data.prompts) ? data.prompts : null);
      if (!list) { res.errors.push('Expected an array of prompts or an object with a "prompts" array.'); return res; }
      if (list.length > MAX_ITEMS) { res.errors.push('Too many prompts (limit ' + MAX_ITEMS + ').'); return res; }
      const existing = D.store.all();
      list.forEach((raw, i) => {
        const n = '#' + (i + 1);
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) { res.errors.push(n + ': not an object'); return; }
        if (typeof raw.title !== 'string' || !raw.title.trim()) { res.errors.push(n + ': missing title'); return; }
        if (raw.title.length > MAX_TITLE) { res.errors.push(n + ': title too long'); return; }
        if (typeof raw.content !== 'string' || !raw.content.trim()) { res.errors.push(n + ' "' + raw.title.slice(0, 40) + '": missing content'); return; }
        if (raw.content.length > MAX_CONTENT) { res.errors.push(n + ': content too long'); return; }
        if (existing.some((p) => p.title === raw.title.trim() && p.content === raw.content)) { res.skipped++; return; }
        if (res.valid.some((p) => p.title === raw.title.trim() && p.content === raw.content)) { res.skipped++; return; }
        const tags = Array.isArray(raw.tags) ? raw.tags.filter((t) => typeof t === 'string').map((t) => t.trim().slice(0, 30)).filter(Boolean).slice(0, 12) : [];
        const minutes = Number(raw.minutes);
        res.valid.push({
          oldId: typeof raw.id === 'string' ? raw.id : null,
          title: raw.title.trim(),
          description: typeof raw.description === 'string' ? raw.description.slice(0, 500) : '',
          category: D.CATEGORIES.indexOf(raw.category) !== -1 ? raw.category : 'Software Architecture',
          difficulty: D.DIFFICULTIES.indexOf(raw.difficulty) !== -1 ? raw.difficulty : 'Intermediate',
          minutes: isFinite(minutes) && minutes > 0 && minutes <= 240 ? Math.round(minutes) : 10,
          tags,
          content: raw.content
        });
      });
      if (data && !Array.isArray(data) && Array.isArray(data.collections)) {
        data.collections.forEach((c) => {
          if (c && typeof c.name === 'string' && c.name.trim() && c.name.length <= 80 && Array.isArray(c.promptIds)) {
            res.collections.push({ name: c.name.trim(), promptIds: c.promptIds.filter((x) => typeof x === 'string') });
          }
        });
      }
      return res;
    },

    applyImport(res) {
      const idMap = {};
      res.valid.forEach((v) => {
        const rec = D.store.addCustom({ title: v.title, description: v.description, category: v.category, difficulty: v.difficulty, minutes: v.minutes, tags: v.tags, content: v.content });
        if (v.oldId) idMap[v.oldId] = rec.id;
      });
      let cols = 0;
      res.collections.forEach((c) => {
        const ids = c.promptIds.map((id) => idMap[id] || (D.store.exists(id) ? id : null)).filter(Boolean);
        let target = D.store.collections().find((x) => x.name.toLowerCase() === c.name.toLowerCase());
        if (!target) { target = D.store.createCollection(c.name); cols++; }
        ids.forEach((id) => D.store.addToCollection(target.id, id));
      });
      return { prompts: res.valid.length, collections: cols };
    },

    pickFileAndImport(done) {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.json,application/json';
      input.addEventListener('change', () => {
        const f = input.files && input.files[0];
        if (!f) return;
        if (f.size > 5 * 1024 * 1024) { D.toast.show('File is too large (limit 5 MB).', 'error'); return; }
        const r = new FileReader();
        r.onerror = () => D.toast.show('Could not read the file.', 'error');
        r.onload = () => D.exporter.reviewImport(String(r.result), done);
        r.readAsText(f);
      });
      input.click();
    },

    reviewImport(text, done) {
      const res = D.exporter.validateImport(text);
      if (!res.valid.length && !res.collections.length) {
        D.modal.open({ title: 'Nothing to import', size: 'sm', body: `<p>No valid prompts were found.${res.skipped ? ' ' + D.plural(res.skipped, 'prompt') + ' already exist.' : ''}</p>${res.errors.length ? '<ul class="plain-list">' + res.errors.slice(0, 8).map((e) => '<li>' + D.esc(e) + '</li>').join('') + '</ul>' : ''}`, footer: '<button class="btn" data-modal-close>Close</button>' });
        return;
      }
      D.modal.confirm({
        title: 'Import prompts?',
        message: `${D.plural(res.valid.length, 'prompt')} will be added as custom prompts${res.collections.length ? ' and ' + D.plural(res.collections.length, 'collection') + ' merged' : ''}.` + (res.skipped ? ` ${res.skipped} duplicate(s) skipped.` : '') + (res.errors.length ? ` ${res.errors.length} invalid item(s) ignored.` : ''),
        confirmText: 'Import'
      }).then((ok) => {
        if (!ok) return;
        const r = D.exporter.applyImport(res);
        D.toast.show(`Imported ${D.plural(r.prompts, 'prompt')}.`, 'success');
        if (done) done();
      });
    }
  };
})();
