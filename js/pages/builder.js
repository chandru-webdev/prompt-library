(function () {
  'use strict';
  const D = (window.DPH = window.DPH || {});

  const ROLES = ['Senior Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'QA Engineer', 'Software Architect', 'DevOps Engineer', 'Security Engineer', 'Database Engineer', 'AI Engineer'];
  const TASKS = {
    Build: 'Design and implement the following, delivering working, production-quality code.',
    Debug: 'Find the root cause of the following problem, prove it with evidence, then fix it with the smallest correct change.',
    Analyze: 'Analyze the following in depth and report findings, risks and recommendations; do not change anything yet.',
    Review: 'Review the following rigorously and report issues grouped by severity, each with a concrete fix.',
    Refactor: 'Refactor the following to improve structure and readability without changing external behavior.',
    Test: 'Design and write a thorough set of tests for the following, covering happy paths, edge cases and failures.',
    Optimize: 'Find real bottlenecks in the following by measuring first, then optimize and report before and after results.',
    Document: 'Write clear, accurate documentation for the following, derived only from the material provided.',
    Deploy: 'Plan and prepare a safe deployment of the following, including configuration, verification and rollback.',
    Redesign: 'Redesign the following to improve clarity, usability and maintainability while preserving required behavior.'
  };
  const TECHS = ['HTML', 'CSS', 'JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js', 'Express', 'Java', 'Spring Boot', 'Python', 'PostgreSQL', 'MySQL', 'MongoDB', 'Prisma', 'Docker'];
  const FIELDS = [
    ['context', 'Project context', 'What the project is, current stack, relevant files', 'Project context'],
    ['requirements', 'Requirements', 'What must be true when the work is done', 'Requirements'],
    ['constraints', 'Constraints', 'Deadlines, libraries to use or avoid, performance or security limits', 'Constraints'],
    ['output', 'Expected output', 'e.g. working code with tests and a short summary', 'Expected output'],
    ['standards', 'Coding standards', 'Style guide, naming, architecture rules', 'Coding standards'],
    ['testing', 'Testing requirements', 'Frameworks, coverage expectations, cases that must be tested', 'Testing requirements']
  ];

  const defaults = () => ({ role: ROLES[0], task: 'Build', techs: [], context: '', requirements: '', constraints: '', output: '', standards: '', testing: '', target: '' });

  function generate(f) {
    const techs = f.techs.length ? f.techs.join(', ') : 'the most appropriate technologies for this project';
    const parts = [`# Role\nAct as a senior ${f.role.replace(/^Senior /, '')} with deep, practical, current expertise in ${techs}.`];
    parts.push(`# Task\n${f.task}: ${TASKS[f.task]}${f.target.trim() ? '\n\nSubject: ' + f.target.trim() : ''}\nTechnology: ${techs}.`);
    FIELDS.forEach((fl) => { if (f[fl[0]].trim()) parts.push(`# ${fl[3]}\n${f[fl[0]].trim()}`); });
    parts.push('# Working Process\n1. Restate the task, list assumptions and ask about anything critical that is missing.\n2. Inspect existing code and conventions before proposing changes.\n3. Present a short plan, then work in small, verifiable steps.\n4. Verify your work and report honestly what was and was not verified.');
    return parts.join('\n\n');
  }

  D.pages.builder = function (el) {
    const draft = D.storage.get('builder', null);
    const f = Object.assign(defaults(), draft && draft.f ? draft.f : {});
    let output = draft && draft.edited ? draft.output : generate(f);
    let edited = !!(draft && draft.edited);
    const persist = () => D.storage.set('builder', { f, output, edited });

    el.innerHTML = `
      <div class="page-head"><div><h1>Prompt Builder</h1><p>Pick a role, task and stack, add context, and get a structured prompt you can edit, copy, download or save.</p></div>
        <div class="page-actions"><button type="button" class="btn" id="b-reset">${D.icon('rotate-ccw')} Reset</button></div></div>
      <div class="builder-grid">
        <form class="panel" id="b-form" onsubmit="return false" aria-label="Builder options">
          ${D.projectPicker ? D.projectPicker({ label: 'Load a saved project into the builder' }) : ''}
          <div class="field-row">
            <div class="field"><label for="b-role">Role</label><select id="b-role" class="select">${ROLES.map((r) => `<option ${r === f.role ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
            <div class="field"><label for="b-task">Task</label><select id="b-task" class="select">${Object.keys(TASKS).map((t) => `<option ${t === f.task ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
          </div>
          <fieldset class="field" style="border:0;padding:0;margin:0 0 14px"><legend class="label" style="margin-bottom:6px">Technology</legend>
            <div class="chip-group">${TECHS.map((t) => `<label class="chip-check"><input type="checkbox" value="${t}" ${f.techs.indexOf(t) !== -1 ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div></fieldset>
          <div class="field"><label for="b-target">What exactly? <span class="muted">(feature, bug, module…)</span></label><input id="b-target" class="input" data-f="target" value="${D.esc(f.target)}" placeholder="e.g. Add refresh-token rotation to the login API"></div>
          ${FIELDS.map((fl) => `<div class="field"><label for="b-${fl[0]}">${fl[1]}</label><textarea id="b-${fl[0]}" class="textarea" rows="2" data-f="${fl[0]}" placeholder="${D.esc(fl[2])}">${D.esc(f[fl[0]])}</textarea></div>`).join('')}
        </form>
        <section class="panel builder-out" aria-labelledby="b-out-h">
          <div class="section-head"><h2 id="b-out-h">Generated prompt</h2><span class="badge" id="b-badge"></span></div>
          <label class="sr-only" for="b-result">Generated prompt (editable)</label>
          <textarea id="b-result" class="textarea mono" rows="22"></textarea>
          <p class="out-note" id="b-note" hidden>You edited this prompt by hand. Changing the options will not overwrite it until you regenerate.</p>
          <div class="out-actions">
            <button type="button" class="btn btn-primary" id="b-copy">${D.icon('copy')} Copy</button>
            <button type="button" class="btn" id="b-save">${D.icon('save')} Save</button>
            <button type="button" class="btn" id="b-regen">${D.icon('refresh-cw')} Regenerate</button>
            <button type="button" class="btn" id="b-qc">${D.icon('gauge')} Check quality</button>
            <button type="button" class="btn" id="b-txt">${D.icon('file-text')} TXT</button>
            <button type="button" class="btn" id="b-md">${D.icon('file-code')} Markdown</button>
          </div>
        </section>
      </div>`;

    const out = D.$('#b-result', el);
    const note = D.$('#b-note', el);
    const badge = D.$('#b-badge', el);
    const sync = () => {
      out.value = output;
      note.hidden = !edited;
      const missing = D.vars.unresolved(output);
      badge.textContent = missing.length ? `${missing.length} placeholder${missing.length === 1 ? '' : 's'}` : `${output.length} chars`;
      badge.className = 'badge ' + (missing.length ? 'badge-warn' : '');
    };
    const regen = () => { output = generate(f); edited = false; sync(); persist(); };
    sync();

    D.$('#b-role', el).addEventListener('change', (e) => { f.role = e.target.value; if (!edited) regen(); else persist(); });
    D.$('#b-task', el).addEventListener('change', (e) => { f.task = e.target.value; if (!edited) regen(); else persist(); });
    D.$$('.chip-check input', el).forEach((cb) => cb.addEventListener('change', () => {
      f.techs = D.$$('.chip-check input:checked', el).map((c) => c.value);
      if (!edited) regen(); else persist();
    }));
    D.$$('[data-f]', el).forEach((inp) => inp.addEventListener('input', () => { f[inp.dataset.f] = inp.value; if (!edited) { output = generate(f); sync(); } persist(); }));
    out.addEventListener('input', () => { output = out.value; edited = true; note.hidden = false; persist(); badge.textContent = `${output.length} chars`; badge.className = 'badge'; });

    D.$('#b-qc', el).addEventListener('click', () => D.quality.show(output));
    const picker = D.$('[data-project]', el);
    if (picker) picker.addEventListener('change', () => {
      const proj = D.store.project(picker.value);
      if (!proj) return;
      f.context = [proj.name ? 'Project: ' + proj.name : '', proj.architecture].filter(Boolean).join('\n');
      if (proj.requirements) f.requirements = proj.requirements;
      if (proj.standards) f.standards = proj.standards;
      if (proj.notes) f.constraints = proj.notes;
      const hit = TECHS.filter((t) => proj.stack.toLowerCase().indexOf(t.toLowerCase()) !== -1);
      if (hit.length) f.techs = hit;
      if (!edited) output = generate(f);
      persist();
      D.pages.builder(el);
      D.toast.show('Loaded from "' + proj.name + '"', 'info', 2000);
    });
    D.$('#b-regen', el).addEventListener('click', () => { regen(); D.toast.show('Prompt regenerated from your selections', 'success', 1800); });
    D.$('#b-copy', el).addEventListener('click', () => {
      const go = () => D.clipboard.copy(output).then((ok) => D.toast.show(ok ? 'Prompt copied to clipboard' : 'Copy failed. Select the text and copy manually.', ok ? 'success' : 'error'));
      const missing = D.vars.unresolved(output);
      if (!output.trim()) { D.toast.show('Nothing to copy yet', 'error'); return; }
      if (missing.length) D.modal.confirm({ title: 'Unresolved placeholders', message: `The prompt still contains ${missing.map((m) => '[' + m + ']').join(', ')}. Copy anyway?`, confirmText: 'Copy anyway' }).then((ok) => ok && go()); else go();
    });
    const dl = (fmt) => {
      if (!output.trim()) { D.toast.show('Nothing to download yet', 'error'); return; }
      D.exporter.exportPrompt({ title: `${f.task} ${f.role}`, description: `Generated with the Prompt Builder for ${f.role}.`, category: 'Custom', difficulty: 'Intermediate', minutes: 10, tags: f.techs.map((t) => t.toLowerCase()) }, fmt, output);
      D.toast.show('Download started', 'success', 1800);
    };
    D.$('#b-txt', el).addEventListener('click', () => dl('txt'));
    D.$('#b-md', el).addEventListener('click', () => dl('md'));
    D.$('#b-save', el).addEventListener('click', () => {
      if (!output.trim()) { D.toast.show('Nothing to save yet', 'error'); return; }
      D.editor.open(null, { title: `${f.task} · ${f.role}`, description: `Built with the Prompt Builder (${f.techs.join(', ') || 'general'}).`, category: 'Full Stack Development', tags: f.techs.map((t) => t.toLowerCase()), content: output });
    });
    D.$('#b-reset', el).addEventListener('click', () => {
      D.modal.confirm({ title: 'Reset the builder?', message: 'All fields and the generated prompt will be cleared.', confirmText: 'Reset', danger: true }).then((ok) => {
        if (!ok) return;
        D.storage.set('builder', null);
        D.pages.builder(el);
        D.toast.show('Builder reset', 'success', 1800);
      });
    });
    D.icons();
  };
})();
