(function () {
  'use strict';
  const D = (window.DPH = window.DPH || {});

  D.clipboard = {
    copy(text) {
      const fallback = () => {
        try {
          const ta = document.createElement('textarea');
          ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
          document.body.appendChild(ta); ta.select();
          const ok = document.execCommand('copy');
          document.body.removeChild(ta);
          return ok;
        } catch (e) { return false; }
      };
      if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext !== false) {
        return navigator.clipboard.writeText(text).then(() => true, () => fallback());
      }
      return Promise.resolve(fallback());
    }
  };
})();
