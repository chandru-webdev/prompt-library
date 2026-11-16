(function () {
  'use strict';
  const D = (window.DPH = window.DPH || {});
  D.pages = D.pages || {};
  D.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  D.$ = (s, r) => (r || document).querySelector(s);
  D.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  D.debounce = (fn, ms) => {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms == null ? 150 : ms); };
  };
  D.icon = (name, cls) => `<i data-lucide="${name}" class="icon ${cls || ''}" aria-hidden="true"></i>`;
  D.icons = () => { try { if (window.lucide && window.lucide.createIcons) window.lucide.createIcons(); } catch (e) { /* icons are decorative */ } };
  D.plural = (n, w) => `${n} ${n === 1 ? w : (/(s|x|z|ch|sh)$/.test(w) ? w + 'es' : w + 's')}`;
  D.timeAgo = (t) => {
    const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + ' h ago';
    return Math.floor(s / 86400) + ' d ago';
  };
})();
