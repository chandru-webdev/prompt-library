(function () {
  'use strict';
  const D = (window.DPH = window.DPH || {});
  const esc = D.esc;
  const pad = (n) => String(n).padStart(2, '0');
  const uid = () => 't' + Math.random().toString(36).slice(2, 7);
  const copyText = (t) => {
    if (!t) { D.toast.show('Nothing to copy', 'error', 1500); return; }
    D.clipboard.copy(t).then((ok) => D.toast.show(ok ? 'Copied to clipboard' : 'Copy failed', ok ? 'success' : 'error', 1500));
  };
  const msg = (node, text, kind) => { node.textContent = text || ''; node.className = 'tool-msg' + (text ? ' ' + (kind || 'ok') : ''); };

  /* ---------- shared two-pane text tool ---------- */
  function simple(root, o) {
    const id = uid();
    root.innerHTML = `<div class="tool-shell">
      ${o.controls ? `<div class="tool-actions" data-controls>${o.controls}</div>` : ''}
      <div class="tool-cols">
        <div class="field"><label for="${id}i">${o.inLabel || 'Input'}</label><textarea id="${id}i" class="textarea mono" rows="${o.rows || 12}" spellcheck="false" placeholder="${esc(o.placeholder || '')}"></textarea></div>
        <div class="field"><label for="${id}o">${o.outLabel || 'Output'}</label><textarea id="${id}o" class="textarea mono" rows="${o.rows || 12}" readonly></textarea></div>
      </div>
      <div class="tool-actions">${o.actions.map((a, i) => `<button type="button" class="btn ${i === 0 ? 'btn-primary' : ''}" data-a="${i}">${a.label}</button>`).join('')}<button type="button" class="btn" data-copy>Copy output</button><button type="button" class="btn btn-ghost" data-clear>Clear</button></div>
      <div class="tool-msg" id="${id}m" role="status"></div></div>`;
    const inp = D.$('#' + id + 'i', root), out = D.$('#' + id + 'o', root), m = D.$('#' + id + 'm', root);
    const run = (a) => {
      try {
        const r = a.run(inp.value, root);
        if (typeof r === 'string') { out.value = r; msg(m, ''); } else { out.value = r.out; msg(m, r.msg, r.kind); }
      } catch (e) { out.value = ''; msg(m, e.message || String(e), 'err'); }
    };
    root.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.a != null) { if (!inp.value.trim() && !o.allowEmpty) { msg(m, 'Enter some input first.', 'warn'); return; } run(o.actions[Number(b.dataset.a)]); }
      else if (b.hasAttribute('data-copy')) copyText(out.value);
      else if (b.hasAttribute('data-clear')) { inp.value = ''; out.value = ''; msg(m, ''); inp.focus(); }
    });
    return { inp, out, m };
  }

  /* ---------- JSON ---------- */
  function jsonErr(e, text) {
    let m = e.message || String(e);
    const mm = /position (\d+)/.exec(m);
    if (mm) { const pos = Number(mm[1]); const before = text.slice(0, pos); m += ` (line ${before.split('\n').length}, column ${pos - before.lastIndexOf('\n')})`; }
    return 'Invalid JSON: ' + m;
  }
  const parseJSON = (t) => { try { return JSON.parse(t); } catch (e) { throw new Error(jsonErr(e, t)); } };
  const depth = (v) => (v && typeof v === 'object' ? 1 + Math.max(0, ...Object.values(v).map(depth)) : 0);

  /* ---------- Base64 ---------- */
  function b64enc(s, url) {
    const bytes = new TextEncoder().encode(s); let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    let r = btoa(bin);
    if (url) r = r.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return r;
  }
  function b64dec(s) {
    s = s.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    let bin;
    try { bin = atob(s); } catch (e) { throw new Error('Input is not valid Base64.'); }
    try { return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))); } catch (e) { throw new Error('Decoded bytes are not valid UTF-8 text.'); }
  }

  /* ---------- Colors ---------- */
  function hslToRgb(h, s, l) {
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
  }
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
    let h = 0, s = 0;
    if (max !== min) {
      const d = max - min; s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60;
    }
    return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
  }
  const toHex = (r, g, b) => '#' + [r, g, b].map((n) => pad(n.toString(16))).join('');
  function parseColor(str) {
    str = str.trim();
    let m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(str);
    if (m) { let h = m[1]; if (h.length === 3) h = h.split('').map((c) => c + c).join(''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
    m = /^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*(?:[,/]\s*[\d.]+%?\s*)?\)$/i.exec(str);
    if (m) { const v = [m[1], m[2], m[3]].map(Number); if (v.every((n) => n <= 255)) return v; }
    m = /^hsla?\(\s*(\d{1,3})(?:deg)?\s*[, ]\s*(\d{1,3})%\s*[, ]\s*(\d{1,3})%\s*(?:[,/]\s*[\d.]+%?\s*)?\)$/i.exec(str);
    if (m && Number(m[1]) <= 360 && Number(m[2]) <= 100 && Number(m[3]) <= 100) return hslToRgb(Number(m[1]), Number(m[2]), Number(m[3]));
    return null;
  }

  /* ---------- Markdown (small, HTML-escaping renderer) ---------- */
  function renderMd(src) {
    const inline = (t) => esc(t)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    const lines = src.replace(/\r\n?/g, '\n').split('\n');
    const out = []; let i = 0;
    while (i < lines.length) {
      const l = lines[i];
      if (/^```/.test(l)) { const buf = []; i++; while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]); i++; out.push('<pre><code>' + esc(buf.join('\n')) + '</code></pre>'); continue; }
      let m;
      if ((m = /^(#{1,6})\s+(.*)$/.exec(l))) { out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`); i++; continue; }
      if (/^\s*([-*_])\1\1+\s*$/.test(l)) { out.push('<hr>'); i++; continue; }
      if (/^>\s?/.test(l)) { const buf = []; while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, '')); out.push('<blockquote>' + inline(buf.join(' ')) + '</blockquote>'); continue; }
      if (/^\s*[-*+]\s+/.test(l)) { const buf = []; while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) buf.push('<li>' + inline(lines[i++].replace(/^\s*[-*+]\s+/, '')) + '</li>'); out.push('<ul>' + buf.join('') + '</ul>'); continue; }
      if (/^\s*\d+[.)]\s+/.test(l)) { const buf = []; while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) buf.push('<li>' + inline(lines[i++].replace(/^\s*\d+[.)]\s+/, '')) + '</li>'); out.push('<ol>' + buf.join('') + '</ol>'); continue; }
      if (!l.trim()) { i++; continue; }
      const buf = [];
      while (i < lines.length && lines[i].trim() && !/^(```|#{1,6}\s|>|\s*[-*+]\s|\s*\d+[.)]\s)/.test(lines[i])) buf.push(lines[i++]);
      out.push('<p>' + inline(buf.join(' ')) + '</p>');
    }
    return out.join('\n');
  }

  /* ---------- Cron ---------- */
  const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  function cronField(str, min, max, names, label) {
    const set = new Set();
    str.split(',').forEach((part) => {
      let m = /^(\*|\?|[\w-]+)(?:\/(\d+))?$/.exec(part);
      let range;
      if (!m) throw new Error(`Invalid ${label} field: "${part}"`);
      const step = m[2] ? Number(m[2]) : 1;
      if (step < 1) throw new Error(`Step in ${label} must be at least 1`);
      const val = (x) => { const i = names ? names.indexOf(x.toLowerCase()) : -1; const n = i !== -1 ? i + (names === MONTHS ? 1 : 0) : Number(x); if (!/^[a-z]+$/i.test(x) && !/^\d+$/.test(x)) throw new Error(`Invalid ${label} value: "${x}"`); if (!isFinite(n)) throw new Error(`Invalid ${label} value: "${x}"`); return n; };
      if (m[1] === '*' || m[1] === '?') range = [min, max];
      else if (m[1].indexOf('-') !== -1) { const [a, b] = m[1].split('-'); range = [val(a), val(b)]; }
      else { const v = val(m[1]); range = m[2] ? [v, max] : [v, v]; }
      if (range[0] < min || range[1] > max || range[0] > range[1]) throw new Error(`${label} must be between ${min} and ${max}`);
      for (let v = range[0]; v <= range[1]; v += step) set.add(v);
    });
    return set;
  }
  function parseCron(expr) {
    const p = expr.trim().split(/\s+/);
    if (p.length !== 5) throw new Error('A cron expression needs exactly 5 fields: minute hour day-of-month month day-of-week.');
    const dow = cronField(p[4], 0, 7, DAYS, 'day-of-week'); if (dow.has(7)) { dow.delete(7); dow.add(0); }
    return { parts: p, min: cronField(p[0], 0, 59, null, 'minute'), hour: cronField(p[1], 0, 23, null, 'hour'), dom: cronField(p[2], 1, 31, null, 'day-of-month'), mon: cronField(p[3], 1, 12, MONTHS, 'month'), dow, domAny: /^[*?]/.test(p[2]), dowAny: /^[*?]/.test(p[4]) };
  }
  function cronNext(c, count) {
    const res = []; const now = new Date();
    for (let d = 0; d < 800 && res.length < count; d++) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
      if (!c.mon.has(day.getMonth() + 1)) continue;
      const domOk = c.dom.has(day.getDate()), dowOk = c.dow.has(day.getDay());
      const ok = c.domAny && c.dowAny ? true : c.domAny ? dowOk : c.dowAny ? domOk : (domOk || dowOk);
      if (!ok) continue;
      for (const h of Array.from(c.hour).sort((a, b) => a - b)) for (const mi of Array.from(c.min).sort((a, b) => a - b)) {
        const t = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, mi);
        if (t > now && res.length < count) res.push(t);
      }
    }
    return res;
  }
  function cronDescribe(p) {
    const [m, h, dom, mon, dow] = p; let s;
    if (m === '*' && h === '*') s = 'Every minute';
    else if (/^\*\/\d+$/.test(m) && h === '*') s = `Every ${m.slice(2)} minutes`;
    else if (/^\d+$/.test(m) && h === '*') s = `At minute ${m} of every hour`;
    else if (/^\d+$/.test(m) && /^\d+$/.test(h)) s = `At ${pad(h)}:${pad(m)}`;
    else if (/^\d+$/.test(m) && /^\*\/\d+$/.test(h)) s = `At minute ${m} of every ${h.slice(2)} hours`;
    else s = `At minute ${m}, hour ${h}`;
    if (dom !== '*' && dom !== '?') s += `, on day-of-month ${dom}`;
    if (mon !== '*') s += `, in month ${mon}`;
    if (dow !== '*' && dow !== '?') s += `, on weekday ${dow} (0 = Sunday)`;
    return s;
  }

  /* ---------- Reference data ---------- */
  const HTTP = [[100, 'Continue', 'Request headers received; client should send the body.'], [101, 'Switching Protocols', 'Server is switching protocols (e.g. WebSocket upgrade).'], [102, 'Processing', 'WebDAV: request is being processed.'], [103, 'Early Hints', 'Preload hints sent before the final response.'], [200, 'OK', 'Request succeeded.'], [201, 'Created', 'A new resource was created.'], [202, 'Accepted', 'Accepted for asynchronous processing.'], [203, 'Non-Authoritative Information', 'Response modified by a proxy.'], [204, 'No Content', 'Success with no response body.'], [205, 'Reset Content', 'Client should reset the document view.'], [206, 'Partial Content', 'Range request satisfied.'], [301, 'Moved Permanently', 'Resource has a new permanent URL.'], [302, 'Found', 'Temporary redirect.'], [303, 'See Other', 'Fetch another URL with GET.'], [304, 'Not Modified', 'Cached copy is still valid.'], [307, 'Temporary Redirect', 'Redirect that preserves the method.'], [308, 'Permanent Redirect', 'Permanent redirect that preserves the method.'], [400, 'Bad Request', 'Malformed request or validation failure.'], [401, 'Unauthorized', 'Authentication is missing or invalid.'], [402, 'Payment Required', 'Reserved; used by some payment APIs.'], [403, 'Forbidden', 'Authenticated but not allowed.'], [404, 'Not Found', 'Resource does not exist.'], [405, 'Method Not Allowed', 'HTTP method not supported on this resource.'], [406, 'Not Acceptable', 'Cannot produce an acceptable representation.'], [408, 'Request Timeout', 'Server timed out waiting for the request.'], [409, 'Conflict', 'Conflicts with current resource state.'], [410, 'Gone', 'Resource permanently removed.'], [411, 'Length Required', 'Content-Length header is required.'], [412, 'Precondition Failed', 'A conditional header evaluated to false.'], [413, 'Content Too Large', 'Request body exceeds the limit.'], [414, 'URI Too Long', 'Request URI is too long.'], [415, 'Unsupported Media Type', 'Content type is not supported.'], [418, "I'm a teapot", 'April Fools RFC 2324 joke status.'], [422, 'Unprocessable Content', 'Well-formed but semantically invalid.'], [423, 'Locked', 'Resource is locked.'], [425, 'Too Early', 'Server unwilling to risk replay.'], [426, 'Upgrade Required', 'Client must switch protocols.'], [428, 'Precondition Required', 'Request must be conditional.'], [429, 'Too Many Requests', 'Rate limit exceeded.'], [431, 'Request Header Fields Too Large', 'Headers too large.'], [451, 'Unavailable For Legal Reasons', 'Blocked for legal reasons.'], [500, 'Internal Server Error', 'Unexpected server failure.'], [501, 'Not Implemented', 'Server lacks the requested capability.'], [502, 'Bad Gateway', 'Invalid response from an upstream server.'], [503, 'Service Unavailable', 'Server overloaded or down for maintenance.'], [504, 'Gateway Timeout', 'Upstream server timed out.'], [505, 'HTTP Version Not Supported', 'HTTP version not supported.'], [507, 'Insufficient Storage', 'WebDAV: server cannot store the content.'], [511, 'Network Authentication Required', 'Client must authenticate to gain network access.']];
  const GIT = [['git init', 'Create a new repository', 'Setup'], ['git clone <url>', 'Copy a remote repository', 'Setup'], ['git config --global user.name "Name"', 'Set your commit author name', 'Setup'], ['git status', 'Show working tree status', 'Basics'], ['git add <file>', 'Stage a file', 'Basics'], ['git add -p', 'Stage changes interactively, hunk by hunk', 'Basics'], ['git commit -m "msg"', 'Commit staged changes', 'Basics'], ['git commit --amend', 'Rewrite the last commit (unpushed only)', 'Basics'], ['git diff', 'Show unstaged changes', 'Basics'], ['git diff --staged', 'Show staged changes', 'Basics'], ['git log --oneline --graph --decorate', 'Compact history graph', 'History'], ['git log -p <file>', 'History of a file with diffs', 'History'], ['git blame <file>', 'Who last changed each line', 'History'], ['git show <commit>', 'Show a commit', 'History'], ['git branch', 'List local branches', 'Branches'], ['git switch -c <branch>', 'Create and switch to a branch', 'Branches'], ['git switch <branch>', 'Switch branches', 'Branches'], ['git branch -d <branch>', 'Delete a merged branch', 'Branches'], ['git merge <branch>', 'Merge a branch into the current one', 'Branches'], ['git rebase <branch>', 'Replay commits on top of another branch', 'Branches'], ['git rebase -i HEAD~3', 'Interactively edit the last 3 commits', 'Branches'], ['git cherry-pick <commit>', 'Apply one commit onto the current branch', 'Branches'], ['git remote -v', 'List remotes', 'Remotes'], ['git fetch', 'Download remote changes without merging', 'Remotes'], ['git pull --rebase', 'Fetch and rebase local commits', 'Remotes'], ['git push -u origin <branch>', 'Push and set upstream', 'Remotes'], ['git push --force-with-lease', 'Safer force push', 'Remotes'], ['git restore <file>', 'Discard working-tree changes to a file', 'Undo'], ['git restore --staged <file>', 'Unstage a file', 'Undo'], ['git reset --soft HEAD~1', 'Undo last commit, keep changes staged', 'Undo'], ['git reset --hard <commit>', 'Reset everything to a commit (destructive)', 'Undo'], ['git revert <commit>', 'Create a commit that undoes another', 'Undo'], ['git reflog', 'Recover lost commits and branch positions', 'Undo'], ['git clean -fd', 'Delete untracked files and folders (destructive)', 'Undo'], ['git stash push -m "msg"', 'Shelve changes', 'Stash'], ['git stash list', 'List stashes', 'Stash'], ['git stash pop', 'Apply and drop the latest stash', 'Stash'], ['git tag -a v1.0.0 -m "msg"', 'Create an annotated tag', 'Tags'], ['git push --tags', 'Push all tags', 'Tags'], ['git bisect start', 'Binary search for the commit that broke something', 'Debug'], ['git grep "text"', 'Search tracked files', 'Debug'], ['git worktree add ../dir <branch>', 'Check out another branch in a new folder', 'Advanced'], ['git submodule update --init --recursive', 'Initialize submodules', 'Advanced']];

  function referenceTool(root, rows, cols, placeholder) {
    const id = uid();
    root.innerHTML = `<div class="tool-shell"><div class="field"><label for="${id}">Filter</label><input id="${id}" class="input" type="search" placeholder="${esc(placeholder)}" autocomplete="off"></div><p class="result-count" id="${id}c" aria-live="polite"></p><div class="table-wrap"><table class="ref-table"><thead><tr>${cols.map((c) => `<th scope="col">${c}</th>`).join('')}</tr></thead><tbody></tbody></table></div></div>`;
    const tb = D.$('tbody', root), count = D.$('#' + id + 'c', root);
    const draw = () => {
      const q = D.$('#' + id, root).value.toLowerCase().trim();
      const list = rows.filter((r) => !q || r.join(' ').toLowerCase().indexOf(q) !== -1);
      count.textContent = `${list.length} of ${rows.length}`;
      tb.innerHTML = list.length ? list.map((r) => `<tr>${r.map((c, i) => `<td>${i === 0 ? `<code>${esc(c)}</code>` : esc(c)}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${cols.length}" class="muted">No matches.</td></tr>`;
    };
    D.$('#' + id, root).addEventListener('input', draw);
    tb.addEventListener('click', (e) => { const c = e.target.closest('code'); if (c) copyText(c.textContent); });
    draw();
  }

  /* ---------- Tool definitions ---------- */
  const TOOLS = [
    { id: 'json-formatter', name: 'JSON Formatter', icon: 'braces', desc: 'Pretty-print JSON with your choice of indentation.', mount(r) {
      simple(r, { controls: '<label for="jf-ind" class="label">Indent</label><select id="jf-ind" class="select" style="width:auto"><option value="2">2 spaces</option><option value="4">4 spaces</option><option value="tab">Tab</option></select>', placeholder: '{"name":"Dev Prompt Hub","tags":["json"]}', actions: [{ label: 'Format', run: (t, root) => { const v = D.$('#jf-ind', root).value; return JSON.stringify(parseJSON(t), null, v === 'tab' ? '\t' : Number(v)); } }] });
    } },
    { id: 'json-validator', name: 'JSON Validator', icon: 'circle-check', desc: 'Check JSON syntax and see where it breaks.', mount(r) {
      simple(r, { placeholder: 'Paste JSON to validate', outLabel: 'Result', actions: [{ label: 'Validate', run: (t) => { const v = parseJSON(t); const type = Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v; const n = v && typeof v === 'object' ? Object.keys(v).length : 0; return { out: `Valid JSON\nType: ${type}${n ? `\nTop-level ${Array.isArray(v) ? 'items' : 'keys'}: ${n}` : ''}\nNesting depth: ${depth(v)}\nSize: ${t.length} characters`, msg: 'Valid JSON', kind: 'ok' }; } }] });
    } },
    { id: 'json-minifier', name: 'JSON Minifier', icon: 'minimize-2', desc: 'Strip whitespace to produce compact JSON.', mount(r) {
      simple(r, { placeholder: 'Paste formatted JSON', actions: [{ label: 'Minify', run: (t) => { const o = JSON.stringify(parseJSON(t)); return { out: o, msg: `Reduced from ${t.length} to ${o.length} characters`, kind: 'ok' }; } }] });
    } },
    { id: 'base64', name: 'Base64 Encoder/Decoder', icon: 'binary', desc: 'Encode or decode text (UTF-8, URL-safe option).', mount(r) {
      simple(r, { controls: '<label class="label"><input type="checkbox" id="b64-url"> URL-safe alphabet when encoding</label>', actions: [{ label: 'Encode', run: (t, root) => b64enc(t, D.$('#b64-url', root).checked) }, { label: 'Decode', run: (t) => b64dec(t) }] });
    } },
    { id: 'url-codec', name: 'URL Encoder/Decoder', icon: 'link', desc: 'Percent-encode or decode URLs and query values.', mount(r) {
      simple(r, { controls: '<label class="label"><input type="checkbox" id="u-full"> Treat input as a full URL (keep : / ? & = #)</label>', actions: [{ label: 'Encode', run: (t, root) => (D.$('#u-full', root).checked ? encodeURI(t) : encodeURIComponent(t)) }, { label: 'Decode', run: (t, root) => { try { return D.$('#u-full', root).checked ? decodeURI(t) : decodeURIComponent(t); } catch (e) { throw new Error('Input contains an invalid percent-encoding.'); } } }] });
    } },
    { id: 'jwt-decoder', name: 'JWT Decoder', icon: 'key-round', desc: 'Decode a token locally. Signatures are not verified.', mount(r) {
      const id = uid();
      r.innerHTML = `<div class="tool-shell"><p class="tool-msg warn" style="display:block">This tool only decodes the token. It does <strong>not</strong> verify the signature, so never trust the contents of a token because they look valid here.</p>
        <div class="field"><label for="${id}">JWT</label><textarea id="${id}" class="textarea mono" rows="5" spellcheck="false" placeholder="eyJhbGciOi..."></textarea></div><div class="tool-msg" id="${id}m"></div>
        <div class="tool-cols"><div class="field"><label>Header</label><pre class="tool-out" id="${id}h"></pre></div><div class="field"><label>Payload</label><pre class="tool-out" id="${id}p"></pre></div></div>
        <div class="field"><label>Signature (raw, unverified)</label><pre class="tool-out" id="${id}s" style="min-height:0"></pre></div><div class="field"><label>Time claims</label><pre class="tool-out" id="${id}t" style="min-height:0"></pre></div></div>`;
      const q = (s) => D.$('#' + id + s, r);
      const run = () => {
        const v = q('').value.trim().replace(/^Bearer\s+/i, '');
        ['h', 'p', 's', 't'].forEach((k) => { q(k).textContent = ''; });
        if (!v) { msg(q('m'), ''); return; }
        const parts = v.split('.');
        if (parts.length !== 3) { msg(q('m'), 'A JWT has three dot-separated parts.', 'err'); return; }
        try {
          const h = JSON.parse(b64dec(parts[0])), p = JSON.parse(b64dec(parts[1]));
          q('h').textContent = JSON.stringify(h, null, 2); q('p').textContent = JSON.stringify(p, null, 2); q('s').textContent = parts[2] || '(empty: unsecured token)';
          const lines = [];
          [['iat', 'Issued at'], ['nbf', 'Not before'], ['exp', 'Expires']].forEach(([k, l]) => { if (typeof p[k] === 'number') lines.push(`${l}: ${new Date(p[k] * 1000).toISOString()}`); });
          if (typeof p.exp === 'number') lines.push(p.exp * 1000 < Date.now() ? 'Status: EXPIRED' : 'Status: not expired (by clock only)');
          q('t').textContent = lines.join('\n') || 'No iat / nbf / exp claims';
          msg(q('m'), h.alg === 'none' ? 'Decoded. Warning: alg is "none" (unsigned token).' : 'Decoded. Signature NOT verified.', h.alg === 'none' ? 'warn' : 'ok');
        } catch (e) { msg(q('m'), 'Could not decode: header or payload is not valid Base64URL JSON.', 'err'); }
      };
      q('').addEventListener('input', run);
    } },
    { id: 'regex-tester', name: 'Regex Tester', icon: 'regex', desc: 'Test JavaScript regular expressions with live highlighting.', mount(r) {
      const id = uid();
      r.innerHTML = `<div class="tool-shell"><div class="tool-cols"><div class="field"><label for="${id}p">Pattern</label><input id="${id}p" class="input mono" placeholder="(\\w+)@(\\w+)\\.com" spellcheck="false"></div><div class="field"><label for="${id}f">Flags</label><input id="${id}f" class="input mono" value="g" maxlength="6" spellcheck="false" aria-describedby="${id}fh"><p class="hint" id="${id}fh">g i m s u y. Without g only the first match is shown.</p></div></div>
        <div class="field"><label for="${id}t">Test text</label><textarea id="${id}t" class="textarea mono" rows="6" spellcheck="false"></textarea></div><div class="tool-msg" id="${id}m" role="status"></div>
        <div class="field"><label>Highlighted matches</label><pre class="tool-out regex-hl" id="${id}h"></pre></div><div class="field"><label>Match details</label><pre class="tool-out" id="${id}d"></pre></div></div>`;
      const q = (s) => D.$('#' + id + s, r);
      const run = () => {
        const p = q('p').value, f = q('f').value, t = q('t').value;
        q('h').textContent = t; q('d').textContent = '';
        if (!p) { msg(q('m'), ''); return; }
        let rx;
        try { rx = new RegExp(p, f.indexOf('g') === -1 ? f + 'g' : f); } catch (e) { msg(q('m'), 'Invalid pattern or flags: ' + e.message, 'err'); return; }
        const single = f.indexOf('g') === -1;
        const found = []; let m;
        while ((m = rx.exec(t)) !== null && found.length < 2000) { found.push(m); if (m[0] === '') rx.lastIndex++; if (single) break; }
        let html = '', last = 0;
        found.forEach((x) => { html += esc(t.slice(last, x.index)) + '<mark>' + esc(x[0]) + '</mark>'; last = x.index + x[0].length; });
        q('h').innerHTML = html + esc(t.slice(last));
        msg(q('m'), found.length ? `${D.plural(found.length, 'match')}${found.length === 2000 ? ' (capped at 2000)' : ''}` : 'No matches', found.length ? 'ok' : 'warn');
        q('d').textContent = found.map((x, i) => `#${i + 1} at ${x.index}: ${JSON.stringify(x[0])}` + (x.length > 1 ? '\n' + x.slice(1).map((g, j) => `   group ${j + 1}: ${g === undefined ? 'undefined' : JSON.stringify(g)}`).join('\n') : '') + (x.groups ? '\n   named: ' + JSON.stringify(x.groups) : '')).join('\n');
      };
      ['p', 'f', 't'].forEach((s) => q(s).addEventListener('input', run));
    } },
    { id: 'uuid', name: 'UUID Generator', icon: 'fingerprint', desc: 'Generate random v4 UUIDs with the browser crypto API.', mount(r) {
      const id = uid();
      r.innerHTML = `<div class="tool-shell"><div class="tool-actions"><label class="label" for="${id}n">Count</label><input id="${id}n" type="number" class="input" style="width:90px" min="1" max="100" value="5"><label class="label"><input type="checkbox" id="${id}u"> Uppercase</label><label class="label"><input type="checkbox" id="${id}h"> Remove hyphens</label><button type="button" class="btn btn-primary" id="${id}g">Generate</button><button type="button" class="btn" id="${id}c">Copy all</button></div><textarea id="${id}o" class="textarea mono" rows="10" readonly aria-label="Generated UUIDs"></textarea></div>`;
      const q = (s) => D.$('#' + id + s, r);
      const v4 = () => { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); const b = crypto.getRandomValues(new Uint8Array(16)); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128; const h = Array.from(b, (x) => pad(x.toString(16))).join(''); return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`; };
      const gen = () => { const n = Math.min(100, Math.max(1, parseInt(q('n').value, 10) || 1)); let l = Array.from({ length: n }, v4); if (q('u').checked) l = l.map((x) => x.toUpperCase()); if (q('h').checked) l = l.map((x) => x.replace(/-/g, '')); q('o').value = l.join('\n'); };
      q('g').addEventListener('click', gen); q('c').addEventListener('click', () => copyText(q('o').value)); gen();
    } },
    { id: 'timestamp', name: 'Timestamp Converter', icon: 'clock', desc: 'Convert between Unix time and readable dates.', mount(r) {
      const id = uid();
      r.innerHTML = `<div class="tool-shell"><div class="tool-actions" style="align-items:flex-end"><div class="field" style="flex:1;min-width:240px"><label for="${id}i">Unix timestamp (seconds or milliseconds) or a date string</label><input id="${id}i" class="input mono" placeholder="1767225600 or 2026-01-01T00:00:00Z"></div><button type="button" class="btn" id="${id}n">Use current time</button></div><div class="tool-msg" id="${id}m" role="status"></div><div class="kv" id="${id}k"></div></div>`;
      const q = (s) => D.$('#' + id + s, r);
      const rel = (d) => { const s = Math.round((d - Date.now()) / 1000), a = Math.abs(s); const u = a < 60 ? [a, 'second'] : a < 3600 ? [Math.floor(a / 60), 'minute'] : a < 86400 ? [Math.floor(a / 3600), 'hour'] : [Math.floor(a / 86400), 'day']; return s >= 0 ? `in ${D.plural(u[0], u[1])}` : `${D.plural(u[0], u[1])} ago`; };
      const run = () => {
        const v = q('i').value.trim(); const k = q('k'); k.innerHTML = '';
        if (!v) { msg(q('m'), ''); return; }
        let d;
        if (/^-?\d+(\.\d+)?$/.test(v)) { const n = Number(v); d = new Date(Math.abs(n) >= 1e11 ? n : n * 1000); } else d = new Date(v);
        if (isNaN(d.getTime())) { msg(q('m'), 'Could not understand that value.', 'err'); return; }
        msg(q('m'), '');
        const rows = [['Unix (seconds)', String(Math.floor(d.getTime() / 1000))], ['Unix (milliseconds)', String(d.getTime())], ['ISO 8601 (UTC)', d.toISOString()], ['UTC', d.toUTCString()], ['Local', d.toString()], ['Relative', rel(d)]];
        k.innerHTML = rows.map((x) => `<span class="kv-label">${x[0]}</span><code>${esc(x[1])}</code><button type="button" class="btn btn-ghost btn-sm" data-c="${esc(x[1])}" aria-label="Copy ${x[0]}">Copy</button>`).join('');
      };
      q('i').addEventListener('input', run);
      q('n').addEventListener('click', () => { q('i').value = String(Math.floor(Date.now() / 1000)); run(); });
      q('k').addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (b) copyText(b.dataset.c); });
    } },
    { id: 'char-counter', name: 'Character Counter', icon: 'hash', desc: 'Count characters, bytes and lines as you type.', mount(r) {
      const id = uid();
      r.innerHTML = `<div class="tool-shell"><div class="field"><label for="${id}i">Text</label><textarea id="${id}i" class="textarea" rows="9"></textarea></div><div class="stat-boxes" id="${id}s"></div></div>`;
      const draw = () => { const t = D.$('#' + id + 'i', r).value; const items = [['Characters', Array.from(t).length], ['Without spaces', Array.from(t.replace(/\s/g, '')).length], ['Bytes (UTF-8)', new TextEncoder().encode(t).length], ['Lines', t ? t.split('\n').length : 0]]; D.$('#' + id + 's', r).innerHTML = items.map((x) => `<div class="stat-box"><b>${x[1]}</b><span>${x[0]}</span></div>`).join(''); };
      D.$('#' + id + 'i', r).addEventListener('input', draw); draw();
    } },
    { id: 'word-counter', name: 'Word Counter', icon: 'whole-word', desc: 'Words, sentences, paragraphs and reading time.', mount(r) {
      const id = uid();
      r.innerHTML = `<div class="tool-shell"><div class="field"><label for="${id}i">Text</label><textarea id="${id}i" class="textarea" rows="9"></textarea></div><div class="stat-boxes" id="${id}s"></div><div class="field"><label>Most frequent words</label><pre class="tool-out" id="${id}f" style="min-height:0"></pre></div></div>`;
      const draw = () => {
        const t = D.$('#' + id + 'i', r).value; const words = t.trim() ? t.trim().split(/\s+/) : [];
        const sentences = (t.match(/[^.!?]+[.!?]+(\s|$)/g) || []).length || (t.trim() ? 1 : 0);
        const paras = t.split(/\n\s*\n/).filter((x) => x.trim()).length;
        const items = [['Words', words.length], ['Sentences', sentences], ['Paragraphs', paras], ['Reading time (min)', words.length ? Math.max(1, Math.round(words.length / 225)) : 0]];
        D.$('#' + id + 's', r).innerHTML = items.map((x) => `<div class="stat-box"><b>${x[1]}</b><span>${x[0]}</span></div>`).join('');
        const freq = {}; words.forEach((w) => { w = w.toLowerCase().replace(/[^\p{L}\p{N}']/gu, ''); if (w.length > 2) freq[w] = (freq[w] || 0) + 1; });
        D.$('#' + id + 'f', r).textContent = Object.keys(freq).sort((a, b) => freq[b] - freq[a] || a.localeCompare(b)).slice(0, 8).map((w) => `${w}: ${freq[w]}`).join('\n') || 'No words yet';
      };
      D.$('#' + id + 'i', r).addEventListener('input', draw); draw();
    } },
    { id: 'case-converter', name: 'Case Converter', icon: 'case-sensitive', desc: 'UPPER, lower, Title, camelCase, snake_case and more.', mount(r) {
      const words = (t) => t.replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(/[^A-Za-z0-9]+/).filter(Boolean).map((w) => w.toLowerCase());
      const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);
      const acts = [['UPPER CASE', (t) => t.toUpperCase()], ['lower case', (t) => t.toLowerCase()], ['Title Case', (t) => t.toLowerCase().replace(/(^|\s)(\S)/g, (m, a, b) => a + b.toUpperCase())], ['Sentence case', (t) => t.toLowerCase().replace(/(^\s*|[.!?]\s+)(\p{L})/gu, (m, a, b) => a + b.toUpperCase())], ['camelCase', (t) => { const w = words(t); return w.map((x, i) => (i ? cap(x) : x)).join(''); }], ['PascalCase', (t) => words(t).map(cap).join('')], ['snake_case', (t) => words(t).join('_')], ['kebab-case', (t) => words(t).join('-')], ['CONSTANT_CASE', (t) => words(t).join('_').toUpperCase()]];
      simple(r, { placeholder: 'Type or paste text', actions: acts.map((a) => ({ label: a[0], run: a[1] })) });
    } },
    { id: 'markdown', name: 'Markdown Previewer', icon: 'file-text', desc: 'Live preview for common Markdown. HTML is escaped.', mount(r) {
      const id = uid();
      r.innerHTML = `<div class="tool-shell"><div class="tool-cols"><div class="field"><label for="${id}i">Markdown</label><textarea id="${id}i" class="textarea mono" rows="16" spellcheck="false"># Title\n\nSome **bold**, *italic* and \`code\`.\n\n- Item one\n- Item two\n\n> A quote\n\n\`\`\`\nconsole.log('hi');\n\`\`\`</textarea></div><div class="field"><label id="${id}l">Preview</label><div class="md-preview" id="${id}p" aria-labelledby="${id}l"></div></div></div><p class="hint">Supports headings, bold, italic, inline code, code blocks, links (http/https), lists, quotes and rules. Raw HTML is never rendered.</p></div>`;
      const inp = D.$('#' + id + 'i', r); inp.value = '# Title\n\nSome **bold**, *italic* and `code`.\n\n- Item one\n- Item two\n\n> A quote\n\n```\nconsole.log(\'hi\');\n```';
      const draw = () => { D.$('#' + id + 'p', r).innerHTML = renderMd(inp.value); }; inp.addEventListener('input', draw); draw();
    } },
    { id: 'html-entities', name: 'HTML Entity Encoder/Decoder', icon: 'code', desc: 'Escape or unescape HTML special characters.', mount(r) {
      simple(r, { controls: '<label class="label"><input type="checkbox" id="he-all"> Also encode non-ASCII characters</label>', placeholder: '<div class="a">Tom & "Jerry"</div>', actions: [{ label: 'Encode', run: (t, root) => { let o = t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); if (D.$('#he-all', root).checked) o = Array.from(o).map((c) => (c.codePointAt(0) > 127 ? '&#' + c.codePointAt(0) + ';' : c)).join(''); return o; } }, { label: 'Decode', run: (t) => new DOMParser().parseFromString(t, 'text/html').documentElement.textContent }] });
    } },
    { id: 'color-converter', name: 'Color Converter', icon: 'palette', desc: 'Convert between HEX, RGB and HSL.', mount(r) {
      const id = uid();
      r.innerHTML = `<div class="tool-shell"><div class="tool-actions" style="align-items:flex-end"><div class="field" style="flex:1;min-width:220px"><label for="${id}i">Color (HEX, rgb() or hsl())</label><input id="${id}i" class="input mono" value="#7b8cff" spellcheck="false"></div><div class="field"><label for="${id}c">Picker</label><input id="${id}c" type="color" value="#7b8cff" style="width:56px;height:34px;border:0;background:none"></div></div><div class="tool-msg" id="${id}m" role="status"></div><div class="swatch" id="${id}s" role="img" aria-label="Color preview"></div><div class="kv" id="${id}k"></div></div>`;
      const q = (s) => D.$('#' + id + s, r);
      const draw = () => {
        const c = parseColor(q('i').value);
        if (!c) { msg(q('m'), 'Enter a valid HEX, rgb() or hsl() color.', 'err'); q('k').innerHTML = ''; return; }
        msg(q('m'), '');
        const hex = toHex(...c), hsl = rgbToHsl(...c);
        q('s').style.background = hex; q('c').value = hex;
        const rows = [['HEX', hex.toUpperCase()], ['RGB', `rgb(${c.join(', ')})`], ['HSL', `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`]];
        q('k').innerHTML = rows.map((x) => `<span class="kv-label">${x[0]}</span><code>${esc(x[1])}</code><button type="button" class="btn btn-ghost btn-sm" data-c="${esc(x[1])}" aria-label="Copy ${x[0]}">Copy</button>`).join('');
      };
      q('i').addEventListener('input', draw);
      q('c').addEventListener('input', () => { q('i').value = q('c').value; draw(); });
      q('k').addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (b) copyText(b.dataset.c); });
      draw();
    } },
    { id: 'gradient', name: 'CSS Gradient Generator', icon: 'blend', desc: 'Build linear, radial or conic gradients and copy the CSS.', mount(r) {
      const id = uid();
      r.innerHTML = `<div class="tool-shell"><div class="tool-cols"><div>
        <div class="field"><label for="${id}t">Type</label><select id="${id}t" class="select"><option>linear</option><option>radial</option><option>conic</option></select></div>
        <div class="field" id="${id}af"><label for="${id}a">Angle: <span id="${id}av">90</span>°</label><input id="${id}a" type="range" min="0" max="360" value="90"></div>
        ${[['#7b8cff', 0], ['#4cc38a', 100]].map((s, i) => `<div class="tool-actions" style="margin-bottom:10px"><label class="label" for="${id}c${i}">Stop ${i + 1}</label><input id="${id}c${i}" type="color" value="${s[0]}" style="width:48px;height:32px;border:0;background:none"><label class="sr-only" for="${id}p${i}">Position ${i + 1}</label><input id="${id}p${i}" type="number" class="input" style="width:80px" min="0" max="100" value="${s[1]}">%</div>`).join('')}
        <button type="button" class="btn" id="${id}x">Swap colors</button></div>
        <div><div class="grad-preview" id="${id}v" role="img" aria-label="Gradient preview"></div><div class="field" style="margin-top:12px"><label for="${id}o">CSS</label><textarea id="${id}o" class="textarea mono" rows="3" readonly></textarea></div><button type="button" class="btn btn-primary" id="${id}cp">Copy CSS</button></div></div></div>`;
      const q = (s) => D.$('#' + id + s, r);
      const draw = () => {
        const t = q('t').value, a = q('a').value; q('av').textContent = a; q('af').style.display = t === 'radial' ? 'none' : '';
        const stops = [0, 1].map((i) => `${q('c' + i).value} ${Math.min(100, Math.max(0, Number(q('p' + i).value) || 0))}%`).join(', ');
        const g = t === 'linear' ? `linear-gradient(${a}deg, ${stops})` : t === 'radial' ? `radial-gradient(circle, ${stops})` : `conic-gradient(from ${a}deg, ${stops})`;
        q('v').style.background = g; q('o').value = `background: ${g};`;
      };
      r.addEventListener('input', draw);
      q('x').addEventListener('click', () => { const a = q('c0').value; q('c0').value = q('c1').value; q('c1').value = a; draw(); });
      q('cp').addEventListener('click', () => copyText(q('o').value)); draw();
    } },
    { id: 'password-strength', name: 'Password Strength Checker', icon: 'shield-check', desc: 'Estimate strength locally. Nothing is stored or sent.', mount(r) {
      const id = uid();
      r.innerHTML = `<div class="tool-shell"><p class="tool-msg ok" style="display:block">Checked entirely in your browser. The password is never stored, logged or sent anywhere. Still, avoid typing a password you use for real accounts into any tool.</p>
        <div class="field"><label for="${id}i">Password</label><div class="inline-form" style="margin:0"><input id="${id}i" class="input mono" type="password" autocomplete="off" spellcheck="false"><button type="button" class="btn" id="${id}t" aria-pressed="false">Show</button></div></div>
        <div class="meter" role="progressbar" aria-label="Strength" aria-valuemin="0" aria-valuemax="4" aria-valuenow="0" id="${id}m"><div id="${id}b" style="width:0"></div></div><div class="tool-msg" id="${id}r" role="status"></div><div class="stat-boxes" id="${id}s"></div><ul class="plain-list" id="${id}f"></ul></div>`;
      const q = (s) => D.$('#' + id + s, r);
      const COMMON = ['password', '123456', '12345678', 'qwerty', 'abc123', 'letmein', 'admin', 'welcome', 'iloveyou', 'monkey', 'dragon', 'football', 'login', 'passw0rd', 'master', 'hello', 'freedom', 'whatever', 'trustno1', '111111', '000000', 'qwertyuiop', 'password1', 'admin123', 'india123'];
      const human = (s) => (s < 1 ? 'instantly' : s < 60 ? Math.round(s) + ' seconds' : s < 3600 ? Math.round(s / 60) + ' minutes' : s < 86400 ? Math.round(s / 3600) + ' hours' : s < 31557600 ? Math.round(s / 86400) + ' days' : s < 31557600 * 1e6 ? Math.round(s / 31557600).toLocaleString() + ' years' : 'millions of years or more');
      const run = () => {
        const p = q('i').value; const fb = [];
        if (!p) { q('b').style.width = '0'; q('r').textContent = ''; q('r').className = 'tool-msg'; q('s').innerHTML = ''; q('f').innerHTML = ''; return; }
        let pool = 0; if (/[a-z]/.test(p)) pool += 26; if (/[A-Z]/.test(p)) pool += 26; if (/\d/.test(p)) pool += 10; if (/[^A-Za-z0-9]/.test(p)) pool += 33;
        let bits = p.length * Math.log2(pool || 1);
        const lower = p.toLowerCase();
        if (COMMON.some((c) => lower.indexOf(c) !== -1)) { bits = Math.min(bits, 20); fb.push('Contains a very common password or word.'); }
        if (/(.)\1{2,}/.test(p)) { bits -= 8; fb.push('Avoid repeated characters.'); }
        if (/(abc|bcd|cde|123|234|345|456|567|678|789|qwe|asd|zxc)/i.test(p)) { bits -= 8; fb.push('Avoid keyboard or alphabet sequences.'); }
        if (p.length < 12) fb.push('Use at least 12 characters; length matters most.');
        if (pool < 62) fb.push('Mix upper and lower case letters, digits and symbols, or use a long passphrase of random words.');
        bits = Math.max(0, bits);
        const score = bits < 28 ? 0 : bits < 36 ? 1 : bits < 60 ? 2 : bits < 80 ? 3 : 4;
        const labels = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'], colors = ['#ef6b6b', '#e8864a', '#e8b04a', '#8bc34a', '#4cc38a'];
        q('b').style.width = (score + 1) * 20 + '%'; q('b').style.background = colors[score]; q('m').setAttribute('aria-valuenow', score);
        msg(q('r'), `${labels[score]} (about ${Math.round(bits)} bits of entropy, a rough estimate)`, score < 2 ? 'err' : score < 3 ? 'warn' : 'ok');
        q('s').innerHTML = [['Length', p.length], ['Entropy (bits)', Math.round(bits)], ['Offline crack time', human(Math.pow(2, bits) / 2 / 1e10)]].map((x) => `<div class="stat-box"><b style="font-size:${String(x[1]).length > 9 ? 13 : 20}px">${esc(x[1])}</b><span>${x[0]}</span></div>`).join('');
        q('f').innerHTML = fb.map((x) => `<li>${esc(x)}</li>`).join('');
      };
      q('i').addEventListener('input', run);
      q('t').addEventListener('click', () => { const show = q('i').type === 'password'; q('i').type = show ? 'text' : 'password'; q('t').textContent = show ? 'Hide' : 'Show'; q('t').setAttribute('aria-pressed', show); });
    } },
    { id: 'http-status', name: 'HTTP Status Code Reference', icon: 'globe', desc: 'Searchable list of common HTTP status codes.', mount(r) { referenceTool(r, HTTP.map((x) => [String(x[0]), x[1], x[2]]), ['Code', 'Name', 'Meaning'], 'Search by code, name or meaning, e.g. 404 or timeout'); } },
    { id: 'git-reference', name: 'Git Command Reference', icon: 'git-branch', desc: 'Everyday Git commands. Click a command to copy it.', mount(r) { referenceTool(r, GIT, ['Command', 'What it does', 'Group'], 'Search commands, e.g. stash or rebase'); } },
    { id: 'cron', name: 'Cron Expression Helper', icon: 'timer', desc: 'Validate a 5-field cron expression and preview next runs.', mount(r) {
      const id = uid();
      const presets = [['Every minute', '* * * * *'], ['Every 5 minutes', '*/5 * * * *'], ['Hourly', '0 * * * *'], ['Daily at 09:00', '0 9 * * *'], ['Weekdays at 08:30', '30 8 * * 1-5'], ['Monthly (1st, midnight)', '0 0 1 * *']];
      r.innerHTML = `<div class="tool-shell"><div class="field"><label for="${id}i">Cron expression <span class="muted">(minute hour day-of-month month day-of-week)</span></label><input id="${id}i" class="input mono" value="*/15 9-17 * * 1-5" spellcheck="false"></div><div class="chip-row" aria-label="Presets">${presets.map((p) => `<button type="button" class="chip" data-v="${p[1]}">${p[0]}</button>`).join('')}</div><div class="tool-msg" id="${id}m" role="status"></div><div class="field"><label>Plain-English summary (approximate)</label><pre class="tool-out" id="${id}d" style="min-height:0"></pre></div><div class="field"><label>Next 5 runs (your local time zone)</label><ul class="cron-next tool-out" id="${id}n" style="min-height:0"></ul></div><p class="hint">Standard 5-field syntax: * , - / and names such as MON or JAN. Seconds, L, W and # are not supported. If both day-of-month and day-of-week are set, either may match (standard cron behavior).</p></div>`;
      const q = (s) => D.$('#' + id + s, r);
      const run = () => {
        const v = q('i').value; q('d').textContent = ''; q('n').innerHTML = '';
        try {
          const c = parseCron(v);
          msg(q('m'), 'Valid expression', 'ok'); q('d').textContent = cronDescribe(c.parts);
          const next = cronNext(c, 5); q('n').innerHTML = next.length ? next.map((d) => `<li>${esc(d.toString().replace(/ GMT.*$/, ''))}</li>`).join('') : '<li>No run within the next ~2 years</li>';
        } catch (e) { msg(q('m'), e.message, 'err'); }
      };
      q('i').addEventListener('input', run);
      r.addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (b) { q('i').value = b.dataset.v; run(); } });
      run();
    } }
  ];

  D.TOOLS = TOOLS;
  D.pages.tools = function (el, route) {
    const id = route.parts[1];
    if (!id) {
      el.innerHTML = `<div class="page-head"><div><h1>Developer Tools</h1><p>${TOOLS.length} utilities that run entirely in your browser. Nothing you enter is sent anywhere.</p></div></div>
        <div class="tool-grid">${TOOLS.map((t) => `<a class="card tool-tile" href="#/tools/${t.id}"><span class="stat-icon">${D.icon(t.icon)}</span><h3>${esc(t.name)}</h3><p>${esc(t.desc)}</p></a>`).join('')}</div>`;
      return;
    }
    const tool = TOOLS.find((t) => t.id === id);
    if (!tool) { el.innerHTML = `<div class="empty-state">${D.icon('wrench')}<h3>Tool not found</h3><p>That tool does not exist.</p><a class="btn" href="#/tools">All tools</a></div>`; return; }
    el.innerHTML = `<a class="tool-back" href="#/tools">${D.icon('arrow-left')} All tools</a><div class="page-head"><div><h1>${esc(tool.name)}</h1><p>${esc(tool.desc)}</p></div></div><div class="panel" id="tool-root"></div>`;
    tool.mount(D.$('#tool-root', el));
  };
})();
