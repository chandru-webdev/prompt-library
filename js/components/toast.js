(function () {
  'use strict';
  const D = (window.DPH = window.DPH || {});

  D.toast = {
    show(message, type, ms) {
      const root = D.$('#toast-root');
      if (!root) return;
      const el = document.createElement('div');
      el.className = 'toast toast-' + (type || 'info');
      el.setAttribute('role', type === 'error' ? 'alert' : 'status');
      const icon = { success: 'check-circle-2', error: 'alert-triangle', info: 'info' }[type || 'info'];
      el.innerHTML = D.icon(icon) + '<span>' + D.esc(message) + '</span>';
      root.appendChild(el);
      D.icons();
      while (root.children.length > 4) root.removeChild(root.firstChild);
      setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 250); }, ms || 3000);
    }
  };
})();
