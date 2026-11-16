(function () {
  'use strict';
  const D = (window.DPH = window.DPH || {});
  const RE = /\[([A-Z][A-Z0-9_]{1,40})\]/g;

  const HINTS = {
    FEATURE: 'What exactly should be built?',
    TECHNOLOGY: 'e.g. React, TypeScript, Node.js, PostgreSQL',
    PROJECT_CONTEXT: 'What the project is, current stack, relevant files, constraints',
    REQUIREMENTS: 'Functional requirements and acceptance criteria',
    EXPECTED_RESULT: 'What a finished, successful answer looks like',
    SYSTEM_OR_PROBLEM: 'The system or problem to analyze',
    CONSTRAINTS: 'Team size, deadlines, budget, compliance, existing systems',
    PROBLEM_DESCRIPTION: 'What happens, and what should happen instead',
    ERROR_OR_LOGS: 'Paste the error message, stack trace or logs',
    CODE_TO_REVIEW: 'Paste the code, diff or configuration',
    TARGET_UNDER_TEST: 'The function, feature or system to test',
    SUBJECT: 'What the document is about',
    AUDIENCE: 'Who will read it'
  };

  D.vars = {
    extract(text) {
      const out = [];
      String(text || '').replace(RE, (m, n) => { if (out.indexOf(n) === -1) out.push(n); return m; });
      return out;
    },
    fill(text, values) {
      return String(text || '').replace(RE, (m, n) => {
        const v = values && values[n];
        return v && String(v).trim() ? String(v).trim() : m;
      });
    },
    unresolved(text) { return D.vars.extract(text); },
    label(name) { return name.toLowerCase().split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '); },
    hint(name) { return HINTS[name] || 'Enter a value for ' + D.vars.label(name); }
  };
})();
