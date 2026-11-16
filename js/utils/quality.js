(function () {
  'use strict';
  const D = (window.DPH = window.DPH || {});

  const TECH = /\b(html|css|javascript|typescript|react|next\.?js|node\.?js|express|java|spring( boot)?|python|django|fastapi|flask|sql|postgres(ql)?|mysql|mongodb|prisma|docker|kubernetes|aws|graphql|redis|nestjs|vue|angular|tailwind|shopify|liquid|jest|playwright|cypress|junit|git(hub)?)\b|\[TECHNOLOGY\]/i;

  const CHECKS = [
    { id: 'role', label: 'Defines a role or persona', weight: 1, test: (t) => /\b(act as|you are|acting as|your role)\b/i.test(t), tip: 'Open with a role, e.g. "Act as a senior backend engineer…".' },
    { id: 'task', label: 'States a clear task', weight: 2, test: (t) => /\b(build|create|implement|write|review|debug|design|analy[sz]e|refactor|fix|explain|generate|optimi[sz]e|test|document|migrate|deploy|audit|plan|add|convert|investigate|find|objective|task|goal)\b/i.test(t), tip: 'Say exactly what you want done, using an action verb (build, review, debug…).' },
    { id: 'context', label: 'Gives project context', weight: 2, test: (t) => /\b(context|background|project|existing|codebase|currently|current|environment|version|legacy)\b/i.test(t), tip: 'Describe the project, what already exists and anything the AI cannot see.' },
    { id: 'tech', label: 'Names the technology or stack', weight: 1.5, test: (t) => TECH.test(t), tip: 'Name languages, frameworks and versions so answers fit your stack.' },
    { id: 'requirements', label: 'Lists requirements or acceptance criteria', weight: 2, test: (t) => /\b(requirements?|must|should|needs? to|acceptance|criteria)\b/i.test(t), tip: 'List what must be true when the work is done, ideally as bullet points.' },
    { id: 'constraints', label: 'Sets constraints or boundaries', weight: 1.5, test: (t) => /\b(constraints?|do not|don't|never|avoid|without|only|must not|limit|at most|no more than)\b/i.test(t), tip: 'State what to avoid: libraries, files not to touch, performance or security limits.' },
    { id: 'output', label: 'Specifies the expected output', weight: 1.5, test: (t) => /\b(output|format|respond|response|return|deliver|expected (result|output)|as a (table|list|diff)|markdown|json)\b/i.test(t), tip: 'Describe the answer you want: code, a plan, a table, a diff, a summary.' },
    { id: 'verify', label: 'Asks for verification or tests', weight: 1, test: (t) => /\b(test|verify|validate|done when|success|edge cases?|assert|check)\b/i.test(t), tip: 'Ask how the result should be verified (tests, edge cases, a checklist).' },
    { id: 'example', label: 'Includes an example', weight: 0.5, test: (t) => /\b(example|e\.g\.|for instance|sample|such as)\b/i.test(t), tip: 'One short example of the input or output removes a lot of guessing.' },
    { id: 'structure', label: 'Is structured (sections or lists)', weight: 0.5, test: (t) => t.split('\n').filter((l) => l.trim()).length >= 4, tip: 'Use short sections or bullet points so each instruction is easy to find.' }
  ];

  const VAGUE = /\b(something|stuff|things?|etc\.?|and so on|somehow|whatever|nice|good|better|best|properly|appropriate|asap|quickly|fast|simple|clean|modern|robust|scalable|efficient)\b/gi;

  D.quality = {
    analyze(text) {
      const t = String(text || '');
      const words = t.trim() ? t.trim().split(/\s+/).length : 0;
      const checks = CHECKS.map((c) => ({ id: c.id, label: c.label, tip: c.tip, weight: c.weight, ok: c.test(t) }));
      checks.push({ id: 'length', label: 'Has enough detail (40+ words)', tip: 'Very short prompts leave the AI guessing. Add context and requirements.', weight: 1.5, ok: words >= 40 });
      const issues = [];
      const missing = D.vars.unresolved(t);
      if (missing.length) issues.push(`Unfilled placeholders: ${missing.map((m) => '[' + m + ']').join(', ')}.`);
      const vague = Array.from(new Set((t.match(VAGUE) || []).map((w) => w.toLowerCase())));
      if (vague.length) issues.push(`Possibly vague wording: ${vague.slice(0, 6).join(', ')}. Replace with something measurable where you can.`);
      if (/\b(this|these|the following|below|attached|above)\s+(code|files?|error|stack ?trace|function|component|schema|query|logs?|diff)\b/i.test(t) && !/```/.test(t) && words < 150) issues.push('Refers to code, errors or files that are not included in the prompt. Paste them in.');
      if (words > 1500) issues.push('Very long prompt (1500+ words). Long prompts can bury the key instructions; trim or split it into steps.');
      const total = checks.reduce((n, c) => n + c.weight, 0);
      const got = checks.reduce((n, c) => n + (c.ok ? c.weight : 0), 0);
      const score = words === 0 ? 0 : Math.max(0, Math.round((got / total) * 100) - Math.min(15, issues.length * 5));
      const grade = score >= 80 ? 'Strong' : score >= 60 ? 'Good' : score >= 40 ? 'Needs work' : 'Weak';
      return { score, grade, words, checks, issues };
    },
    render(r) {
      const c = r.score >= 80 ? 'var(--ok)' : r.score >= 60 ? 'var(--accent)' : r.score >= 40 ? 'var(--warn)' : 'var(--danger)';
      const li = (x) => `<li class="${x.ok ? 'ok' : 'bad'}">${D.icon(x.ok ? 'check-circle-2' : 'circle-dashed')}<span>${D.esc(x.label)}${x.ok ? '' : `<span class="q-tip">${D.esc(x.tip)}</span>`}</span></li>`;
      return `<div class="q-score"><div class="q-num" style="color:${c}">${r.score}<small>/100</small></div><div><strong>${r.grade}</strong><p class="muted" style="margin:0">${D.plural(r.words, 'word')}. Rule-based check, not an AI review.</p></div></div>
        <div class="meter" role="progressbar" aria-label="Prompt quality score" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${r.score}"><div style="width:${r.score}%;background:${c}"></div></div>
        ${r.issues.length ? `<h3 class="q-h">Things to fix</h3><ul class="q-list">${r.issues.map((x) => `<li class="warn">${D.icon('alert-triangle')}<span>${D.esc(x)}</span></li>`).join('')}</ul>` : ''}
        <h3 class="q-h">Checklist</h3><ul class="q-list">${r.checks.map(li).join('')}</ul>`;
    },
    show(text) {
      if (!text || !text.trim()) { D.toast.show('Write or paste a prompt first', 'error'); return; }
      D.modal.open({ title: 'Prompt quality check', size: 'md', body: '<div>' + D.quality.render(D.quality.analyze(text)) + '</div>', footer: '<button type="button" class="btn btn-primary" data-modal-close>Close</button>' });
    }
  };
})();
