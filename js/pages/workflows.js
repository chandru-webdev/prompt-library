(function () {
  'use strict';
  const D = (window.DPH = window.DPH || {});

  D.WORKFLOWS = [
    { id: 'wf-feature', name: 'Feature delivery', description: 'Analyze, plan, implement, test and review a new feature.', steps: ['requirements-analysis', 'feature-planning', 'end-to-end-feature-implementation', 'unit-testing', 'code-review'], builtin: true },
    { id: 'wf-bugfix', name: 'Bug fix', description: 'Find the root cause, add a regression test and review the fix.', steps: ['root-cause-analysis', 'regression-testing', 'code-review'], builtin: true },
    { id: 'wf-legacy', name: 'Legacy modernization', description: 'Understand an old codebase, size the debt and plan a safe migration.', steps: ['codebase-understanding', 'technical-debt-analysis', 'legacy-code-modernization', 'regression-testing'], builtin: true },
    { id: 'wf-security', name: 'Security hardening', description: 'Audit, secure the API, check dependencies and secrets.', steps: ['owasp-security-audit', 'api-security', 'dependency-vulnerability-audit', 'secrets-management'], builtin: true },
    { id: 'wf-release', name: 'Production release', description: 'Checklist, monitoring and rollback plan before shipping.', steps: ['production-deployment-checklist', 'monitoring-and-logging', 'rollback-strategy'], builtin: true }
  ];

  const stepsOf = (wf) => wf.steps.map(D.store.get).filter(Boolean);

  function chain(wf) {
    const s = stepsOf(wf);
    return `<div class="chain">${s.map((p, i) => `${i ? '<span class="arrow" aria-hidden="true">→</span>' : ''}<span class="chip">${D.esc(p.title)}</span>`).join('')}</div>`;
  }

  function editor(seed, id) {
    const ex = id ? D.store.workflow(id) : null;
    const base = ex || seed || { name: '', description: '', steps: [] };
    let ids = base.steps.filter((s) => D.store.exists(s));
    const all = D.store.all().slice().sort((a, b) => a.title.localeCompare(b.title));
    const form = document.createElement('form');
    form.noValidate = true;
    form.innerHTML = `<div class="field"><label for="wf-name">Chain name <span class="req">*</span></label><input id="wf-name" class="input" maxlength="80" value="${D.esc(base.name)}"><p class="field-error" id="wf-err" role="alert"></p></div>
      <div class="field"><label for="wf-desc">Description</label><input id="wf-desc" class="input" maxlength="200" value="${D.esc(base.description || '')}"></div>
      <div class="field"><span class="label">Steps, in order</span><ol class="wf-edit-list" id="wf-list"></ol></div>
      <div class="field"><label for="wf-filter">Add a step</label><div class="inline-form" style="margin:0"><input id="wf-filter" class="input" type="search" placeholder="Filter prompts…" autocomplete="off"><select id="wf-pick" class="select" aria-label="Prompt to add"></select><button type="button" class="btn" id="wf-add">${D.icon('plus')} Add</button></div></div>`;
    const list = D.$('#wf-list', form), pick = D.$('#wf-pick', form);
    const drawList = () => {
      list.innerHTML = ids.length ? ids.map((sid, i) => { const p = D.store.get(sid); return `<li><span>${D.esc(p ? p.title : sid)}</span><span class="wf-ctl"><button type="button" class="btn btn-ghost btn-icon btn-sm" data-up="${i}" aria-label="Move up" ${i === 0 ? 'disabled' : ''}>${D.icon('arrow-up')}</button><button type="button" class="btn btn-ghost btn-icon btn-sm" data-down="${i}" aria-label="Move down" ${i === ids.length - 1 ? 'disabled' : ''}>${D.icon('arrow-down')}</button><button type="button" class="btn btn-ghost btn-icon btn-sm" data-rm="${i}" aria-label="Remove step">${D.icon('x')}</button></span></li>`; }).join('') : '<li class="muted">No steps yet. Add at least two.</li>';
      D.icons();
    };
    const drawPick = () => {
      const q = D.$('#wf-filter', form).value.toLowerCase().trim();
      const rows = all.filter((p) => !q || (p.title + ' ' + p.category).toLowerCase().indexOf(q) !== -1).slice(0, 80);
      pick.innerHTML = rows.length ? rows.map((p) => `<option value="${D.esc(p.id)}">${D.esc(p.title)}</option>`).join('') : '<option value="">No matches</option>';
    };
    drawList(); drawPick();
    D.$('#wf-filter', form).addEventListener('input', drawPick);
    form.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.id === 'wf-add') { if (pick.value) { ids.push(pick.value); drawList(); } return; }
      if (b.dataset.up != null) { const i = Number(b.dataset.up); [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]]; drawList(); }
      else if (b.dataset.down != null) { const i = Number(b.dataset.down); [ids[i + 1], ids[i]] = [ids[i], ids[i + 1]]; drawList(); }
      else if (b.dataset.rm != null) { ids.splice(Number(b.dataset.rm), 1); drawList(); }
    });
    const h = D.modal.open({ title: ex ? 'Edit workflow chain' : 'New workflow chain', size: 'md', body: form, footer: `<button type="button" class="btn" data-modal-close>Cancel</button><button type="button" class="btn btn-primary" data-save>${ex ? 'Save changes' : 'Create chain'}</button>` });
    const save = () => {
      const name = D.$('#wf-name', form).value.trim();
      const err = D.$('#wf-err', form);
      if (!name) { err.textContent = 'Name is required.'; D.$('#wf-name', form).focus(); return; }
      if (ids.length < 2) { err.textContent = 'Add at least two steps.'; return; }
      D.store.saveWorkflow({ name, description: D.$('#wf-desc', form).value.trim(), steps: ids.slice() }, id);
      h.close(true); D.toast.show('Workflow chain saved', 'success'); D.app.refresh(true);
    };
    D.$('[data-save]', h.el).addEventListener('click', save);
    form.addEventListener('submit', (e) => { e.preventDefault(); save(); });
  }

  function listPage(el) {
    const custom = D.store.workflows();
    const card = (w) => `<article class="card col-card"><h3>${D.esc(w.name)} ${w.builtin ? '<span class="badge">Built-in</span>' : '<span class="badge badge-custom">Custom</span>'}</h3><p class="muted">${D.esc(w.description || '')}</p>${chain(w)}
      <div class="col-actions"><a class="btn btn-sm btn-primary" href="#/workflows/${w.id}">Run chain</a>${w.builtin ? `<button type="button" class="btn btn-sm" data-wa="copy" data-id="${w.id}">Customize</button>` : `<button type="button" class="btn btn-sm" data-wa="edit" data-id="${w.id}">Edit</button><button type="button" class="btn btn-sm btn-danger" data-wa="del" data-id="${w.id}">Delete</button>`}</div></article>`;
    el.innerHTML = `<div class="pg"><div class="page-head"><div><h1>Workflow Chains</h1><p>Run prompts in sequence, Analyze → Plan → Implement → Test → Review. Variables are shared, and each step can receive the previous AI answer as context.</p></div><div class="page-actions"><button type="button" class="btn btn-primary" data-wa="new">${D.icon('plus')} New chain</button></div></div>
      <div class="col-grid" style="grid-template-columns:repeat(auto-fill,minmax(340px,1fr))">${D.WORKFLOWS.concat(custom).map(card).join('')}</div></div>`;
    D.$('.pg', el).addEventListener('click', (e) => {
      const b = e.target.closest('[data-wa]'); if (!b) return;
      const a = b.dataset.wa;
      if (a === 'new') editor(null, null);
      else if (a === 'copy') { const w = D.store.workflow(b.dataset.id); editor({ name: w.name + ' (custom)', description: w.description, steps: w.steps.slice() }, null); }
      else if (a === 'edit') editor(null, b.dataset.id);
      else if (a === 'del') { const w = D.store.workflow(b.dataset.id); D.modal.confirm({ title: 'Delete chain?', message: `"${w ? w.name : ''}" will be deleted. The prompts in it are not affected.`, confirmText: 'Delete', danger: true }).then((ok) => { if (ok) { D.store.deleteWorkflow(b.dataset.id); D.storage.set('wf:' + b.dataset.id, null); D.toast.show('Chain deleted', 'success', 1800); D.app.refresh(true); } }); }
    });
    D.icons();
  }

  function runner(el, wf) {
    const steps = stepsOf(wf);
    const skipped = wf.steps.length - steps.length;
    const key = 'wf:' + wf.id;
    const saved = Object.assign({ vals: {}, outs: {}, done: {} }, D.storage.get(key, null) || {});
    const names = [];
    steps.forEach((p) => D.vars.extract(p.content).forEach((n) => { if (names.indexOf(n) === -1) names.push(n); }));
    const persist = () => D.storage.set(key, saved);
    el.innerHTML = `<div class="pg"><a class="tool-back" href="#/workflows">${D.icon('arrow-left')} All chains</a><div class="page-head"><div><h1>${D.esc(wf.name)}</h1><p>${D.esc(wf.description || '')}</p>${chain(wf)}${skipped ? `<p class="out-note">${D.plural(skipped, 'step')} skipped because the prompt no longer exists.</p>` : ''}</div></div>
      <div class="builder-grid"><section class="panel" aria-labelledby="wf-vars-h"><h2 id="wf-vars-h">Shared variables</h2>${D.projectPicker({ label: 'Fill from a saved project' })}
        ${names.map((n) => `<div class="field"><label for="wv-${n}">${D.vars.label(n)} <code>[${n}]</code></label><textarea id="wv-${n}" class="textarea" rows="2" data-var="${n}" placeholder="${D.esc(D.vars.hint(n))}">${D.esc(saved.vals[n] || '')}</textarea></div>`).join('')}
        <button type="button" class="btn btn-ghost btn-sm" data-wa="reset">${D.icon('rotate-ccw')} Reset this run</button></section>
        <div class="wf-steps">${steps.map((p, i) => `<article class="card wf-step" data-i="${i}"><div class="wf-head"><span class="wf-num">${i + 1}</span><h3><button type="button" class="link-btn" data-act="view" data-id="${D.esc(p.id)}">${D.esc(p.title)}</button></h3><label class="wf-done"><input type="checkbox" data-done ${saved.done[i] ? 'checked' : ''}> Done</label></div>
          <pre class="prompt-pre" data-pre tabindex="0" aria-label="Step ${i + 1} prompt"></pre><div class="wf-actions"><button type="button" class="btn btn-primary btn-sm" data-copy>${D.icon('copy')} Copy step prompt</button><span class="badge" data-badge></span></div>
          ${i < steps.length - 1 ? `<div class="field" style="margin-top:12px"><label for="wo-${i}">AI answer from this step <span class="muted">(optional; added to step ${i + 2} as context)</span></label><textarea id="wo-${i}" class="textarea" rows="3" data-out="${i}" placeholder="Paste the assistant's answer here">${D.esc(saved.outs[i] || '')}</textarea></div>` : ''}</article>`).join('')}</div></div></div>`;
    const root = D.$('.pg', el);
    const build = (i) => {
      let t = D.vars.fill(steps[i].content, saved.vals);
      const prev = i > 0 ? (saved.outs[i - 1] || '').trim() : '';
      if (prev) t += `\n\nContext from the previous step (${steps[i - 1].title}):\n${prev}`;
      return t;
    };
    const update = () => {
      D.$$('.wf-step', root).forEach((card, i) => {
        const t = build(i), miss = D.vars.unresolved(t).length;
        D.$('[data-pre]', card).innerHTML = D.esc(t).replace(/\[([A-Z][A-Z0-9_]{1,40})\]/g, '<mark class="ph">[$1]</mark>');
        const b = D.$('[data-badge]', card); b.textContent = miss ? `${miss} unresolved` : 'Ready'; b.className = 'badge ' + (miss ? 'badge-warn' : 'badge-ok');
      });
    };
    root.addEventListener('input', (e) => {
      const v = e.target.closest('[data-var]'), o = e.target.closest('[data-out]');
      if (v) saved.vals[v.dataset.var] = v.value; else if (o) saved.outs[o.dataset.out] = o.value; else return;
      persist(); update();
    });
    root.addEventListener('change', (e) => {
      const d = e.target.closest('[data-done]');
      if (d) { saved.done[d.closest('.wf-step').dataset.i] = d.checked; persist(); return; }
      const s = e.target.closest('[data-project]');
      if (s) {
        const proj = D.store.project(s.value); if (!proj) return;
        const vals = D.projectValues(proj); let n = 0;
        names.forEach((k) => { if (vals[k]) { saved.vals[k] = vals[k]; const f = D.$('#wv-' + k, root); if (f) f.value = vals[k]; n++; } });
        persist(); update(); D.toast.show(n ? `Filled ${D.plural(n, 'variable')} from "${proj.name}"` : 'This chain has no variables the project can fill', 'info', 2200);
      }
    });
    root.addEventListener('click', (e) => {
      const c = e.target.closest('[data-copy]');
      if (c) { const i = Number(c.closest('.wf-step').dataset.i); D.actions.copyFilled(steps[i], build(i), saved.vals); return; }
      if (e.target.closest('[data-wa="reset"]')) D.modal.confirm({ title: 'Reset this run?', message: 'Variables, pasted answers and done marks for this chain will be cleared.', confirmText: 'Reset', danger: true }).then((ok) => { if (ok) { D.storage.set(key, null); D.pages.workflows(el, D.app.route); D.toast.show('Run reset', 'success', 1600); } });
    });
    update(); D.icons();
  }

  D.pages.workflows = function (el, route) {
    const id = route && route.parts[1];
    if (!id) { listPage(el); return; }
    const wf = D.store.workflow(id);
    if (!wf) { el.innerHTML = `<div class="empty-state">${D.icon('workflow')}<h3>Chain not found</h3><p>It may have been deleted.</p><a class="btn" href="#/workflows">All chains</a></div>`; D.icons(); return; }
    runner(el, wf);
  };
})();
