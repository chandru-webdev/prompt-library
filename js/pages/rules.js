(function () {
  'use strict';
  const D = (window.DPH = window.DPH || {});

  const FIELDS = [
    ['name', 'Project name', 'input', ''], ['description', 'One-line description', 'input', ''],
    ['stack', 'Tech stack (comma or one per line)', 'textarea', 'React 18, TypeScript, Node.js, PostgreSQL'],
    ['install', 'Install command', 'input', 'npm install'], ['dev', 'Dev command', 'input', 'npm run dev'], ['build', 'Build command', 'input', 'npm run build'], ['test', 'Test command', 'input', 'npm test'], ['lint', 'Lint command', 'input', 'npm run lint'],
    ['structure', 'Project structure and key directories', 'textarea', 'src/api: route handlers\nsrc/services: business logic'],
    ['conventions', 'Coding conventions (one per line)', 'textarea', 'Use TypeScript strict mode\nPrefer named exports'],
    ['testing', 'Testing approach (one per line)', 'textarea', 'Every bug fix gets a regression test'],
    ['security', 'Security rules (one per line)', 'textarea', 'Never log secrets\nValidate all request input'],
    ['always', 'Always do (one per line)', 'textarea', 'Run the tests before finishing'],
    ['never', 'Never do (one per line)', 'textarea', 'Edit generated files in /dist'],
    ['extra', 'Other notes', 'textarea', '']
  ];

  const list = (t, comma) => String(t || '').split(comma ? /[\n,]/ : /\n/).map((s) => s.replace(/^\s*[-*•]\s*/, '').trim()).filter(Boolean);
  const bl = (a) => a.map((x) => '- ' + x).join('\n');

  const AGREEMENTS = ['Read the relevant code and existing conventions before changing anything.', 'For changes touching several files, state a short plan first.', 'Make the smallest change that solves the task; do not edit unrelated code.', 'Run the tests and linter before finishing, and say what you did and did not verify.', 'If a requirement is ambiguous, ask instead of guessing.'];

  function sections(f) {
    const out = [];
    const stack = list(f.stack, true); if (stack.length) out.push(['Tech stack', bl(stack)]);
    const cmds = [['Install', f.install], ['Dev server', f.dev], ['Build', f.build], ['Test', f.test], ['Lint', f.lint]].filter((c) => c[1].trim()).map((c) => `- ${c[0]}: \`${c[1].trim()}\``);
    if (cmds.length) out.push(['Commands', cmds.join('\n')]);
    if (f.structure.trim()) out.push(['Project structure', f.structure.trim()]);
    [['conventions', 'Coding conventions'], ['testing', 'Testing'], ['security', 'Security']].forEach((x) => { const l = list(f[x[0]]); if (l.length) out.push([x[1], bl(l)]); });
    const al = list(f.always), nv = list(f.never);
    if (al.length || nv.length) out.push(['Boundaries', (al.length ? '**Always**\n' + bl(al) : '') + (al.length && nv.length ? '\n\n' : '') + (nv.length ? '**Never**\n' + bl(nv) : '')]);
    if (f.extra.trim()) out.push(['Notes', f.extra.trim()]);
    out.push(['Working agreements', bl(AGREEMENTS)]);
    return out;
  }
  const join = (s) => s.map((x) => `## ${x[0]}\n\n${x[1]}`).join('\n\n') + '\n';

  const FORMATS = [
    { id: 'claude', label: 'CLAUDE.md', path: 'CLAUDE.md', build: (f, s) => `# ${f.name.trim() || 'Project'}\n\n${f.description.trim() ? f.description.trim() + '\n\n' : ''}${join(s)}` },
    { id: 'agents', label: 'AGENTS.md', path: 'AGENTS.md', build: (f, s) => `# AGENTS.md\n\nGuidance for AI coding agents working on ${f.name.trim() || 'this project'}.${f.description.trim() ? ' ' + f.description.trim() : ''}\n\n${join(s)}` },
    { id: 'cursor', label: 'Cursor rules', path: '.cursor/rules/project.mdc', build: (f, s) => `---\ndescription: Project conventions for ${f.name.trim() || 'this project'}\nglobs:\nalwaysApply: true\n---\n\n${join(s)}` },
    { id: 'copilot', label: 'Copilot instructions', path: '.github/copilot-instructions.md', build: (f, s) => `# Copilot instructions for ${f.name.trim() || 'this repository'}\n\n${f.description.trim() ? f.description.trim() + '\n\n' : ''}${join(s)}` }
  ];
  D.RULE_FORMATS = FORMATS;
  D.generateRules = (f, id) => FORMATS.find((x) => x.id === id).build(f, sections(f));

  D.pages.rules = function (el, route) {
    const f = Object.assign({}, ...FIELDS.map((x) => ({ [x[0]]: '' })), D.storage.get('rules', {}));
    let cur = 'claude';
    if (route.params.project) {
      const p = D.store.project(route.params.project);
      if (p) { f.name = p.name; f.stack = p.stack; f.structure = p.architecture; f.conventions = p.standards; f.extra = [p.requirements, p.notes].filter(Boolean).join('\n'); D.storage.set('rules', f); }
    }
    el.innerHTML = `<div class="pg"><div class="page-head"><div><h1>Agent Rules Generator</h1><p>Generate CLAUDE.md, AGENTS.md, Cursor rules and Copilot instructions from one form. Review the result before committing it; short, specific rules work better than long ones.</p></div></div>
      <div class="builder-grid"><form class="panel" onsubmit="return false" aria-label="Rules options">${D.projectPicker({ label: 'Load from a saved project' })}
        ${FIELDS.map((x) => `<div class="field"><label for="r-${x[0]}">${x[1]}</label>${x[2] === 'input' ? `<input id="r-${x[0]}" class="input" data-f="${x[0]}" maxlength="300" placeholder="${D.esc(x[3])}" value="${D.esc(f[x[0]])}">` : `<textarea id="r-${x[0]}" class="textarea" rows="3" data-f="${x[0]}" maxlength="4000" placeholder="${D.esc(x[3])}">${D.esc(f[x[0]])}</textarea>`}</div>`).join('')}</form>
        <section class="panel builder-out" aria-labelledby="r-out-h"><div class="section-head"><h2 id="r-out-h">Generated files</h2><span class="badge" id="r-lines"></span></div>
          <div class="tabs" role="tablist" aria-label="Output format">${FORMATS.map((x) => `<button type="button" role="tab" class="tab" id="tab-${x.id}" data-tab="${x.id}" aria-selected="${x.id === cur}" aria-controls="r-panel" tabindex="${x.id === cur ? 0 : -1}">${x.label}</button>`).join('')}</div>
          <div id="r-panel" role="tabpanel" aria-labelledby="tab-${cur}"><p class="hint" id="r-path"></p><label class="sr-only" for="r-output">Generated file</label><textarea id="r-output" class="textarea mono" rows="22" readonly></textarea></div>
          <div class="out-actions"><button type="button" class="btn btn-primary" id="r-copy">${D.icon('copy')} Copy</button><button type="button" class="btn" id="r-dl">${D.icon('download')} Download</button><button type="button" class="btn" id="r-all">${D.icon('files')} Download all 4</button></div><p class="hint">Downloading all four triggers four separate downloads; your browser may ask permission.</p></section></div></div>`;
    const root = D.$('.pg', el), out = D.$('#r-output', root);
    const draw = () => {
      const fm = FORMATS.find((x) => x.id === cur), t = D.generateRules(f, cur);
      out.value = t; D.$('#r-path', root).textContent = 'Save as: ' + fm.path;
      const n = t.split('\n').length, b = D.$('#r-lines', root); b.textContent = n + ' lines'; b.className = 'badge ' + (n > 200 ? 'badge-warn' : '');
      b.title = n > 200 ? 'Long instruction files dilute the important rules. Consider trimming.' : '';
      D.$$('[data-tab]', root).forEach((x) => { const on = x.dataset.tab === cur; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; });
      D.$('#r-panel', root).setAttribute('aria-labelledby', 'tab-' + cur);
    };
    root.addEventListener('input', (e) => { const t = e.target.closest('[data-f]'); if (!t) return; f[t.dataset.f] = t.value; D.storage.set('rules', f); draw(); });
    root.addEventListener('change', (e) => {
      const s = e.target.closest('[data-project]'); if (!s) return;
      const p = D.store.project(s.value); if (!p) return;
      Object.assign(f, { name: p.name, stack: p.stack, structure: p.architecture, conventions: p.standards, extra: [p.requirements, p.notes].filter(Boolean).join('\n') });
      Object.keys(f).forEach((k) => { const n = D.$('#r-' + k, root); if (n) n.value = f[k]; });
      D.storage.set('rules', f); draw(); D.toast.show('Loaded from "' + p.name + '"', 'info', 1800);
    });
    root.addEventListener('click', (e) => { const t = e.target.closest('[data-tab]'); if (t) { cur = t.dataset.tab; draw(); } });
    root.addEventListener('keydown', (e) => {
      if (!e.target.closest('[data-tab]') || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
      const i = FORMATS.findIndex((x) => x.id === cur), n = (i + (e.key === 'ArrowRight' ? 1 : FORMATS.length - 1)) % FORMATS.length;
      cur = FORMATS[n].id; draw(); D.$('#tab-' + cur, root).focus();
    });
    D.$('#r-copy', root).addEventListener('click', () => D.clipboard.copy(out.value).then((ok) => D.toast.show(ok ? 'Copied to clipboard' : 'Copy failed', ok ? 'success' : 'error', 1600)));
    const dl = (fm) => D.exporter.download(fm.path.split('/').pop(), D.generateRules(f, fm.id), 'text/markdown');
    D.$('#r-dl', root).addEventListener('click', () => { dl(FORMATS.find((x) => x.id === cur)); D.toast.show('Download started', 'success', 1600); });
    D.$('#r-all', root).addEventListener('click', () => { FORMATS.forEach((fm, i) => setTimeout(() => dl(fm), i * 250)); D.toast.show('Downloading 4 files', 'success', 1800); });
    draw(); D.icons();
  };
})();
