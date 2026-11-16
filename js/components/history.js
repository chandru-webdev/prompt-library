(function () {
  'use strict';
  const D = (window.DPH = window.DPH || {});

  // Line diff (LCS). Returns null when inputs are too large to diff cheaply.
  function diffLines(a, b) {
    const A = a.split('\n'), B = b.split('\n');
    if (A.length > 400 || B.length > 400) return null;
    const n = A.length, m = B.length;
    const L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const out = []; let i = 0, j = 0;
    while (i < n && j < m) {
      if (A[i] === B[j]) { out.push([' ', A[i]]); i++; j++; }
      else if (L[i + 1][j] >= L[i][j + 1]) out.push(['-', A[i++]]);
      else out.push(['+', B[j++]]);
    }
    while (i < n) out.push(['-', A[i++]]);
    while (j < m) out.push(['+', B[j++]]);
    return out;
  }
  D.diffLines = diffLines;

  D.history = {
    open(id) {
      const p = D.store.get(id);
      if (!p || !p.custom) return;
      const versions = D.store.history(id);
      const body = document.createElement('div');
      if (!versions.length) {
        body.innerHTML = `<div class="empty-state">${D.icon('history')}<h3>No earlier versions yet</h3><p>A version is saved automatically every time you edit this prompt. Edit it and come back to compare or restore.</p></div>`;
        D.modal.open({ title: 'Version history', size: 'md', body, footer: '<button type="button" class="btn btn-primary" data-modal-close>Close</button>' });
        return;
      }
      body.innerHTML = `<div class="hist"><ul class="hist-list" aria-label="Saved versions">${versions.map((v, i) => `<li><button type="button" class="hist-item" data-i="${i}"><strong>${D.esc(new Date(v.t).toLocaleString())}</strong><span class="muted">${D.esc(v.snap.title || '')}</span></button></li>`).join('')}</ul><div class="hist-detail" aria-live="polite"></div></div>`;
      const detail = D.$('.hist-detail', body);
      const show = (i) => {
        D.$$('.hist-item', body).forEach((b) => b.setAttribute('aria-current', Number(b.dataset.i) === i));
        const v = versions[i]; const cur = D.store.get(id) || p;
        const d = diffLines(String(v.snap.content || ''), String(cur.content || ''));
        const titleNote = v.snap.title !== cur.title ? `<p class="muted">Title then: "${D.esc(v.snap.title)}" · now: "${D.esc(cur.title)}"</p>` : '';
        const diffHtml = d ? d.map((x) => `<span class="${x[0] === '+' ? 'dl-add' : x[0] === '-' ? 'dl-del' : 'dl-same'}">${D.esc(x[0] + ' ' + x[1])}</span>`).join('') : D.esc(String(v.snap.content || ''));
        detail.innerHTML = `<div class="section-head"><h3>Version from ${D.esc(new Date(v.t).toLocaleString())}</h3><button type="button" class="btn btn-primary btn-sm" data-restore="${i}">${D.icon('rotate-ccw')} Restore this version</button></div>${titleNote}<p class="hint">${d ? 'Lines marked <b>-</b> exist only in this older version, lines marked <b>+</b> exist only in the current prompt.' : 'Prompt is too long for a line diff; showing the old content.'}</p><pre class="prompt-pre diff-view" tabindex="0">${diffHtml}</pre>`;
        D.icons();
      };
      const h = D.modal.open({ title: 'Version history: ' + p.title, size: 'lg', body, footer: '<button type="button" class="btn btn-primary" data-modal-close>Close</button>' });
      body.addEventListener('click', (e) => {
        const it = e.target.closest('.hist-item');
        if (it) { show(Number(it.dataset.i)); return; }
        const r = e.target.closest('[data-restore]');
        if (r) {
          const rec = D.store.restoreVersion(id, Number(r.dataset.restore));
          if (rec) { D.modal.closeAll(); D.toast.show('Version restored. The previous text is saved in history too.', 'success'); D.app.refresh(true); D.viewer.open(id); }
        }
      });
      show(0);
      return h;
    }
  };
})();
