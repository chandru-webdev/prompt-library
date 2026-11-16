(function () {
  'use strict';
  const D = (window.DPH = window.DPH || {});

  D.pages.quality = function (el) {
    const options = D.store.all().slice().sort((a, b) => a.title.localeCompare(b.title));
    el.innerHTML = `<div class="pg"><div class="page-head"><div><h1>Prompt Quality Checker</h1><p>Paste any prompt to find missing context, vague wording and incomplete instructions. Runs locally; your text is never sent anywhere.</p></div></div>
      <div class="builder-grid"><section class="panel" aria-labelledby="q-in-h"><h2 id="q-in-h">Your prompt</h2>
        <div class="field"><label for="q-load">Or load one from the library</label><select id="q-load" class="select"><option value="">Choose a prompt…</option>${options.map((p) => `<option value="${D.esc(p.id)}">${D.esc(p.title)}</option>`).join('')}</select></div>
        <div class="field"><label for="q-text">Prompt text</label><textarea id="q-text" class="textarea mono" rows="16" placeholder="Paste a prompt here…"></textarea></div></section>
        <section class="panel builder-out" aria-labelledby="q-out-h"><h2 id="q-out-h">Result</h2><div id="q-result" aria-live="polite"></div></section></div></div>`;
    const txt = D.$('#q-text', el), out = D.$('#q-result', el);
    const run = () => {
      if (!txt.value.trim()) { out.innerHTML = `<div class="empty-state">${D.icon('gauge')}<h3>Nothing to check yet</h3><p>Paste or load a prompt to see its score and suggestions.</p></div>`; D.icons(); return; }
      out.innerHTML = D.quality.render(D.quality.analyze(txt.value)); D.icons();
    };
    txt.addEventListener('input', D.debounce(run, 150));
    D.$('#q-load', el).addEventListener('change', (e) => { const p = D.store.get(e.target.value); if (p) { txt.value = p.content; run(); } });
    run();
  };
})();
