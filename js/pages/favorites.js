(function () {
  'use strict';
  const D = (window.DPH = window.DPH || {});

  D.pages.favorites = function (el, route) {
    D.renderList(el, {
      key: 'favorites', route, title: 'Favorites', subtitle: 'Prompts you starred for quick access.',
      source: () => D.store.favorites(),
      empty: { icon: 'star', title: 'No favorites yet', text: 'Tap the star on any prompt to keep it here.', action: '<a class="btn btn-primary" href="#/prompts">Browse prompts</a>' }
    });
  };

  D.pages.recent = function (el, route) {
    D.renderList(el, {
      key: 'recent', route, title: 'Recently Used', subtitle: 'Prompts you opened or copied, newest first.',
      source: () => D.store.recentPrompts(),
      actions: D.store.recentPrompts().length ? `<button type="button" class="btn" data-act="clear-recent">${D.icon('eraser')} Clear history</button>` : '',
      empty: { icon: 'history', title: 'Nothing used yet', text: 'Open or copy a prompt and it will show up here.', action: '<a class="btn btn-primary" href="#/prompts">Browse prompts</a>' }
    });
  };

  D.pages.custom = function (el, route) {
    D.renderList(el, {
      key: 'custom', route, title: 'Custom Prompts', subtitle: 'Prompts you created, duplicated or imported. Stored only in this browser.',
      source: () => D.store.customPrompts(),
      actions: `<button type="button" class="btn btn-primary" data-act="quick-add">${D.icon('plus')} New prompt</button><button type="button" class="btn" data-act="import-json">${D.icon('upload')} Import JSON</button><button type="button" class="btn" data-act="export-custom" ${D.store.customPrompts().length ? '' : 'disabled'}>${D.icon('download')} Export</button>`,
      empty: { icon: 'pencil-line', title: 'No custom prompts yet', text: 'Create one from scratch, duplicate a library prompt, save one from the Prompt Builder, or import JSON.', action: `<button type="button" class="btn btn-primary" data-act="quick-add">${D.icon('plus')} Create a prompt</button>` }
    });
  };

  function renameDialog(col) {
    const body = document.createElement('form');
    body.innerHTML = `<div class="field"><label for="col-name">Collection name</label><input id="col-name" class="input" maxlength="60" value="${D.esc(col ? col.name : '')}" required data-autofocus><p class="field-error" id="col-err" role="alert"></p></div>`;
    const h = D.modal.open({ title: col ? 'Rename collection' : 'New collection', size: 'sm', body, footer: `<button type="button" class="btn" data-modal-close>Cancel</button><button type="button" class="btn btn-primary" data-save>${col ? 'Rename' : 'Create'}</button>` });
    const save = () => {
      const name = D.$('#col-name', body).value.trim();
      const err = D.$('#col-err', body);
      if (!name) { err.textContent = 'Enter a name.'; return; }
      if (D.store.collections().some((c) => c.id !== (col && col.id) && c.name.toLowerCase() === name.toLowerCase())) { err.textContent = 'A collection with that name already exists.'; return; }
      if (col) D.store.renameCollection(col.id, name); else D.store.createCollection(name);
      h.close(true);
      D.toast.show(col ? 'Collection renamed' : 'Collection created', 'success');
      D.app.refresh(true);
    };
    D.$('[data-save]', h.el).addEventListener('click', save);
    body.addEventListener('submit', (e) => { e.preventDefault(); save(); });
  }
  D.collectionDialog = renameDialog;

  D.pages.collections = function (el, route) {
    const id = route.parts[1];
    if (id) {
      const col = D.store.collection(id);
      if (!col) { el.innerHTML = `<div class="empty-state">${D.icon('folder-x')}<h3>Collection not found</h3><p>It may have been deleted.</p><a class="btn" href="#/collections">Back to collections</a></div>`; D.icons(); return; }
      D.renderList(el, {
        key: 'col-' + id, route, title: col.name, subtitle: `${D.plural(col.promptIds.length, 'prompt')} in this collection.`,
        source: () => col.promptIds.map(D.store.get).filter(Boolean),
        actions: `<a class="btn" href="#/collections">${D.icon('arrow-left')} All collections</a><button type="button" class="btn" data-act="col-rename" data-cid="${col.id}">${D.icon('pencil')} Rename</button><button type="button" class="btn" data-act="col-export" data-cid="${col.id}">${D.icon('download')} Export</button><button type="button" class="btn btn-danger" data-act="col-delete" data-cid="${col.id}">${D.icon('trash-2')} Delete</button>`,
        cardExtra: (p) => `<button type="button" class="btn btn-sm" data-act="col-remove" data-cid="${col.id}" data-id="${D.esc(p.id)}">${D.icon('minus-circle')} Remove</button>`,
        empty: { icon: 'folder-open', title: 'This collection is empty', text: 'Open any prompt and use "Collections" to add it here.', action: '<a class="btn btn-primary" href="#/prompts">Browse prompts</a>' }
      });
      return;
    }
    const cols = D.store.collections();
    el.innerHTML = `
      <div class="page-head"><div><h1>My Collections</h1><p>Group prompts by project, stack or workflow.</p></div>
        <div class="page-actions"><button type="button" class="btn btn-primary" data-act="col-new">${D.icon('folder-plus')} New collection</button><button type="button" class="btn" data-act="col-export-all" ${cols.length ? '' : 'disabled'}>${D.icon('download')} Export all</button></div></div>
      ${cols.length ? `<div class="col-grid">${cols.map((c) => `<article class="card col-card"><h3><a href="#/collections/${c.id}">${D.esc(c.name)}</a></h3><p class="muted">${D.plural(c.promptIds.length, 'prompt')}</p><div class="col-actions"><a class="btn btn-sm btn-primary" href="#/collections/${c.id}">Open</a><button type="button" class="btn btn-sm" data-act="col-rename" data-cid="${c.id}">Rename</button><button type="button" class="btn btn-sm" data-act="col-export" data-cid="${c.id}">Export</button><button type="button" class="btn btn-sm btn-danger" data-act="col-delete" data-cid="${c.id}">Delete</button></div></article>`).join('')}</div>`
        : `<div class="empty-state">${D.icon('folder-kanban')}<h3>No collections yet</h3><p>Collections let you bundle prompts for a project or workflow.</p><button type="button" class="btn btn-primary" data-act="col-new">${D.icon('folder-plus')} Create your first collection</button></div>`}`;
  };
})();
