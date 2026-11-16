(function () {
  'use strict';
  const D = (window.DPH = window.DPH || {});

  // Maps a saved project onto the placeholder names used by prompts.
  D.projectValues = function (p) {
    return {
      TECHNOLOGY: p.stack || '',
      PROJECT_CONTEXT: [p.name ? 'Project: ' + p.name : '', p.architecture].filter(Boolean).join('\n'),
      REQUIREMENTS: p.requirements || '',
      CONSTRAINTS: [p.standards ? 'Coding standards: ' + p.standards : '', p.notes].filter(Boolean).join('\n')
    };
  };

  D.projectPicker = function (o) {
    const list = D.store.projects();
    if (!list.length) return '';
    const act = D.store.activeProject();
    const id = D.uid();
    return `<div class="field proj-pick"><label for="${id}">${D.esc((o && o.label) || 'Saved project')}</label><select id="${id}" class="select" data-project><option value="">Choose a project…</option>${list.map((p) => `<option value="${D.esc(p.id)}">${D.esc(p.name)}${act && act.id === p.id ? ' (active)' : ''}</option>`).join('')}</select></div>`;
  };

  D.projectDialog = function (id) {
    const ex = id ? D.store.project(id) : null;
    const p = ex || { name: '', stack: '', architecture: '', standards: '', requirements: '', notes: '' };
    const form = document.createElement('form');
    form.noValidate = true;
    const ta = (k, label, ph, rows) => `<div class="field"><label for="pj-${k}">${label}</label><textarea id="pj-${k}" class="textarea" rows="${rows || 3}" maxlength="4000" placeholder="${D.esc(ph)}">${D.esc(p[k])}</textarea></div>`;
    form.innerHTML = `<div class="field"><label for="pj-name">Project name <span class="req">*</span></label><input id="pj-name" class="input" maxlength="80" value="${D.esc(p.name)}" required aria-describedby="pj-err"><p class="field-error" id="pj-err" role="alert"></p></div>
      <div class="field"><label for="pj-stack">Tech stack</label><input id="pj-stack" class="input" maxlength="300" value="${D.esc(p.stack)}" placeholder="e.g. React 18, TypeScript, Node.js, PostgreSQL, Prisma"></div>
      ${ta('architecture', 'Architecture and structure', 'What the system does, main modules, folders, data flow', 4)}
      ${ta('standards', 'Coding standards', 'Style rules, naming, patterns to follow')}
      ${ta('requirements', 'Standing requirements', 'Requirements that apply to most tasks (accessibility, browser support, security…)')}
      ${ta('notes', 'Other constraints and notes', 'Anything else the AI should always know', 2)}`;
    const h = D.modal.open({ title: ex ? 'Edit project' : 'New project context', size: 'md', body: form, footer: `<button type="button" class="btn" data-modal-close>Cancel</button><button type="button" class="btn btn-primary" data-save>${ex ? 'Save changes' : 'Save project'}</button>` });
    const save = () => {
      const name = D.$('#pj-name', form).value.trim();
      D.$('#pj-err', form).textContent = name ? '' : 'Project name is required.';
      if (!name) { D.$('#pj-name', form).focus(); return; }
      const data = { name };
      ['stack', 'architecture', 'standards', 'requirements', 'notes'].forEach((k) => { data[k] = D.$('#pj-' + k, form).value.trim(); });
      D.store.saveProject(data, id);
      h.close(true);
      D.toast.show(ex ? 'Project updated' : 'Project saved', 'success');
      D.app.refresh(true);
    };
    D.$('[data-save]', h.el).addEventListener('click', save);
    form.addEventListener('submit', (e) => { e.preventDefault(); save(); });
  };

  D.pages.projects = function (el) {
    const list = D.store.projects();
    const act = D.store.activeProject();
    el.innerHTML = `<div class="pg"><div class="page-head"><div><h1>Project Contexts</h1><p>Save your stack, architecture and standards once. Fill them into any prompt, workflow chain or agent-rules file with one click.</p></div>
      <div class="page-actions"><button type="button" class="btn btn-primary" data-pa="new">${D.icon('plus')} New project</button></div></div>
      ${list.length ? `<div class="col-grid">${list.map((p) => `<article class="card col-card"><h3>${D.esc(p.name)} ${act && act.id === p.id ? '<span class="badge badge-ok">Active</span>' : ''}</h3><p class="muted">${D.esc(p.stack || 'No stack listed')}</p><p class="pc-desc">${D.esc(p.architecture || '')}</p>
        <div class="col-actions"><button type="button" class="btn btn-sm" data-pa="edit" data-id="${p.id}">Edit</button>${act && act.id === p.id ? `<button type="button" class="btn btn-sm" data-pa="unset" data-id="${p.id}">Unset active</button>` : `<button type="button" class="btn btn-sm" data-pa="active" data-id="${p.id}">Set active</button>`}<a class="btn btn-sm" href="#/rules?project=${encodeURIComponent(p.id)}">Agent rules</a><button type="button" class="btn btn-sm btn-danger" data-pa="del" data-id="${p.id}">Delete</button></div></article>`).join('')}</div>`
        : `<div class="empty-state">${D.icon('briefcase')}<h3>No projects yet</h3><p>Add your first project context. Prompts that contain [TECHNOLOGY], [PROJECT_CONTEXT], [REQUIREMENTS] or [CONSTRAINTS] can then be filled from it automatically.</p><button type="button" class="btn btn-primary" data-pa="new">${D.icon('plus')} Create a project</button></div>`}
      <p class="hint" style="margin-top:14px">Stored only in this browser. Include no secrets, credentials or private customer data.</p></div>`;
    D.$('.pg', el).addEventListener('click', (e) => {
      const b = e.target.closest('[data-pa]');
      if (!b) return;
      const a = b.dataset.pa, id = b.dataset.id;
      if (a === 'new') D.projectDialog(null);
      else if (a === 'edit') D.projectDialog(id);
      else if (a === 'active') { D.store.setActiveProject(id); D.toast.show('Set as active project', 'success', 1600); D.app.refresh(true); }
      else if (a === 'unset') { D.store.setActiveProject(null); D.app.refresh(true); }
      else if (a === 'del') {
        const p = D.store.project(id);
        D.modal.confirm({ title: 'Delete project?', message: `"${p ? p.name : ''}" will be permanently deleted from this browser.`, confirmText: 'Delete', danger: true }).then((ok) => { if (ok) { D.store.deleteProject(id); D.toast.show('Project deleted', 'success', 1800); D.app.refresh(true); } });
      }
    });
    D.icons();
  };
})();
