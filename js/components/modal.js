(function () {
  'use strict';
  const D = (window.DPH = window.DPH || {});
  const stack = [];
  const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

  function setContent(target, content) {
    if (content == null) return;
    if (typeof content === 'string') target.innerHTML = content; else target.appendChild(content);
  }

  function close(handle, result) {
    const i = stack.indexOf(handle);
    if (i === -1) return;
    stack.splice(i, 1);
    handle.el.remove();
    if (!stack.length) document.body.classList.remove('no-scroll');
    if (handle.opener && document.contains(handle.opener)) { try { handle.opener.focus(); } catch (e) { /* ignore */ } }
    if (handle.onClose) handle.onClose(result);
  }

  D.modal = {
    open(opts) {
      const root = D.$('#modal-root');
      const id = 'm' + Math.random().toString(36).slice(2, 8);
      const wrap = document.createElement('div');
      wrap.className = 'modal-backdrop';
      wrap.innerHTML = `<div class="modal modal-${opts.size || 'md'} ${opts.className || ''}" role="dialog" aria-modal="true" aria-labelledby="${id}-t" tabindex="-1">
        <div class="modal-head"><h2 id="${id}-t">${D.esc(opts.title || '')}</h2><button type="button" class="btn btn-ghost btn-icon" data-modal-close aria-label="Close dialog">${D.icon('x')}</button></div>
        <div class="modal-body"></div><div class="modal-foot"></div></div>`;
      const modal = D.$('.modal', wrap);
      const body = D.$('.modal-body', wrap);
      const foot = D.$('.modal-foot', wrap);
      setContent(body, opts.body);
      if (opts.footer) setContent(foot, opts.footer); else foot.remove();
      const handle = { el: wrap, modal, body, foot: opts.footer ? foot : null, onClose: opts.onClose, opener: document.activeElement, close: (r) => close(handle, r) };
      wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) handle.close(); });
      wrap.addEventListener('click', (e) => { if (e.target.closest('[data-modal-close]')) handle.close(false); });
      root.appendChild(wrap);
      stack.push(handle);
      document.body.classList.add('no-scroll');
      D.icons();
      const first = D.$('[data-autofocus]', wrap) || D.$(FOCUSABLE, body) || D.$(FOCUSABLE, wrap);
      (first || modal).focus();
      return handle;
    },
    confirm(opts) {
      return new Promise((resolve) => {
        let answered = false;
        const h = D.modal.open({
          title: opts.title, size: 'sm',
          body: `<p class="confirm-msg">${D.esc(opts.message)}</p>`,
          footer: `<button type="button" class="btn" data-modal-close>${D.esc(opts.cancelText || 'Cancel')}</button><button type="button" class="btn ${opts.danger ? 'btn-danger' : 'btn-primary'}" data-ok data-autofocus>${D.esc(opts.confirmText || 'Confirm')}</button>`,
          onClose: () => { if (!answered) resolve(false); }
        });
        D.$('[data-ok]', h.el).addEventListener('click', () => { answered = true; h.close(true); resolve(true); });
      });
    },
    top() { return stack[stack.length - 1] || null; },
    closeAll() { while (stack.length) stack[stack.length - 1].close(); },
    count() { return stack.length; }
  };

  document.addEventListener('keydown', (e) => {
    const top = D.modal.top();
    if (!top) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); top.close(false); return; }
    if (e.key === 'Tab') {
      const items = D.$$(FOCUSABLE, top.modal).filter((n) => n.offsetParent !== null || n === document.activeElement);
      if (!items.length) { e.preventDefault(); top.modal.focus(); return; }
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === top.modal)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, true);
})();
