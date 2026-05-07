// Writer Bro — app.js
// Kannada Screenplay Writer — Browser Version

// ── Constants ─────────────────────────────────────────────────────────────────

const BLOCK_TYPES = ['scene','action','character','dialogue','parenthetical','transition'];

const TYPE_CYCLE = {
  scene: 'action',
  action: 'character',
  character: 'dialogue',
  dialogue: 'action',
  parenthetical: 'dialogue',
  transition: 'scene',
};

const BLOCK_LABELS = {
  scene: 'SCENE',
  action: 'ACTION',
  character: 'CHARACTER',
  dialogue: 'DIALOGUE',
  parenthetical: 'PAREN',
  transition: 'TRANSITION',
};

const PLACEHOLDERS = {
  scene: 'INT./EXT. ಸ್ಥಳ — ಸಮಯ',
  action: 'ದೃಶ್ಯ ವಿವರಣೆ...',
  character: 'ಪಾತ್ರದ ಹೆಸರು',
  dialogue: 'ಸಂಭಾಷಣೆ...',
  parenthetical: '(ಭಾವ / ನಿರ್ದೇಶನ)',
  transition: 'CUT TO: / FADE OUT.',
};

// ── State ─────────────────────────────────────────────────────────────────────

let state = {
  title: 'ಮನೆಗೆ ಮರಳಿ',
  author: '',
  blocks: [],
  idSeq: 0,
  dirty: false,
  currentScriptKey: null,
};

let focusedBlockId = null;

// ── ID Generator ──────────────────────────────────────────────────────────────

function nextId() {
  return 'b' + (++state.idSeq);
}

// ── Block Operations ──────────────────────────────────────────────────────────

function addBlock(type = 'action', text = '', afterId = null) {
  const block = { id: nextId(), type, text };
  if (afterId) {
    const idx = state.blocks.findIndex(b => b.id === afterId);
    state.blocks.splice(idx + 1, 0, block);
  } else {
    state.blocks.push(block);
  }
  state.dirty = true;
  return block.id;
}

function updateBlock(id, patch) {
  const b = state.blocks.find(b => b.id === id);
  if (b) { Object.assign(b, patch); state.dirty = true; }
}

function removeBlock(id) {
  const idx = state.blocks.findIndex(b => b.id === id);
  if (idx >= 0) {
    state.blocks.splice(idx, 1);
    state.dirty = true;
    return state.blocks[Math.max(0, idx - 1)]?.id ?? null;
  }
  return null;
}

function getBlockBefore(id) {
  const idx = state.blocks.findIndex(b => b.id === id);
  return idx > 0 ? state.blocks[idx - 1] : null;
}

// ── Render ────────────────────────────────────────────────────────────────────

function render() {
  renderBlocks();
  renderSceneList();
  renderStats();
  renderTitle();
}

function renderTitle() {
  document.title = (state.dirty ? '● ' : '') + state.title + ' — Writer Bro';
}

function renderBlocks() {
  const container = document.getElementById('scriptBlocks');
  const existing = new Map([...container.querySelectorAll('[data-block-id]')].map(el => [el.dataset.blockId, el]));

  state.blocks.forEach((block, i) => {
    let el = existing.get(block.id);
    if (!el) {
      el = createBlockEl(block);
      container.appendChild(el);
    } else {
      existing.delete(block.id);
      if (el.dataset.type !== block.type) {
        el.className = `script-block block-${block.type}`;
        el.dataset.type = block.type;
        const badge = el.querySelector('.block-badge');
        const ta = el.querySelector('.block-content');
        if (badge) badge.textContent = BLOCK_LABELS[block.type];
        if (ta) ta.placeholder = PLACEHOLDERS[block.type];
      }
    }
    if (container.children[i] !== el) container.insertBefore(el, container.children[i] || null);
  });

  existing.forEach(el => el.remove());
}

function createBlockEl(block) {
  const el = document.createElement('div');
  el.className = `script-block block-${block.type}`;
  el.dataset.blockId = block.id;
  el.dataset.type = block.type;

  const badge = document.createElement('div');
  badge.className = 'block-badge';
  badge.textContent = BLOCK_LABELS[block.type];

  const ta = document.createElement('textarea');
  ta.className = 'block-content';
  ta.value = block.text;
  ta.placeholder = PLACEHOLDERS[block.type];
  ta.rows = 1;
  ta.setAttribute('lang', 'kn');
  ta.setAttribute('spellcheck', 'false');

  ta.addEventListener('input', () => {
    autoResize(ta);
    updateBlock(block.id, { text: ta.value });
    renderSceneList();
    renderStats();
    renderTitle();
  });

  ta.addEventListener('focus', () => {
    focusedBlockId = block.id;
    updatePanelActive(block.type);
  });

  ta.addEventListener('keydown', e => handleKey(e, block.id, ta));

  el.appendChild(badge);
  el.appendChild(ta);
  setTimeout(() => autoResize(ta), 0);
  return el;
}

function renderSceneList() {
  const list = document.getElementById('sceneList');
  const scenes = state.blocks.filter(b => b.type === 'scene');
  list.innerHTML = scenes.map((sc, i) => `
    <div class="scene-item" data-id="${sc.id}">
      <span class="scene-num">${i + 1}</span>${sc.text || '(empty scene)'}
    </div>`).join('');

  list.querySelectorAll('.scene-item').forEach(item => {
    item.addEventListener('click', () => {
      const el = document.querySelector(`[data-block-id="${item.dataset.id}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });
}

function renderStats() {
  const scenes = state.blocks.filter(b => b.type === 'scene').length;
  const words = state.blocks.reduce((n, b) => n + (b.text?.trim().split(/\s+/).filter(Boolean).length || 0), 0);
  const pages = Math.max(1, Math.ceil(words / 150));
  document.getElementById('statScenes').textContent = `${scenes} scenes`;
  document.getElementById('statWords').textContent = `${words} words`;
  document.getElementById('statPages').textContent = `~${pages} pages`;
}

function updatePanelActive(type) {
  document.querySelectorAll('.block-type-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`btnType-${type}`)?.classList.add('active');
}

// ── Key Handling ──────────────────────────────────────────────────────────────

function handleKey(e, blockId, ta) {
  const block = state.blocks.find(b => b.id === blockId);
  if (!block) return;

  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    const nextType = TYPE_CYCLE[block.type] || 'action';
    const newId = addBlock(nextType, '', blockId);
    render();
    setTimeout(() => focusBlock(newId), 10);
    return;
  }

  if (e.key === 'Tab') {
    e.preventDefault();
    const idx = BLOCK_TYPES.indexOf(block.type);
    const next = e.shiftKey
      ? BLOCK_TYPES[(idx - 1 + BLOCK_TYPES.length) % BLOCK_TYPES.length]
      : BLOCK_TYPES[(idx + 1) % BLOCK_TYPES.length];
    updateBlock(blockId, { type: next });
    render();
    setTimeout(() => focusBlock(blockId), 10);
    return;
  }

  if (e.key === 'Backspace' && ta.value === '') {
    e.preventDefault();
    const prev = getBlockBefore(blockId);
    removeBlock(blockId);
    render();
    if (prev) setTimeout(() => focusBlock(prev.id), 10);
    return;
  }

  if (e.ctrlKey || e.metaKey) {
    const typeMap = { '1':'scene','2':'action','3':'character','4':'dialogue','5':'parenthetical','6':'transition' };
    if (typeMap[e.key]) {
      e.preventDefault();
      updateBlock(blockId, { type: typeMap[e.key] });
      render();
      setTimeout(() => focusBlock(blockId), 10);
      return;
    }
    if (e.key === 's') { e.preventDefault(); saveToStorage(); return; }
  }
}

// ── Focus Helper ──────────────────────────────────────────────────────────────

function focusBlock(id) {
  const el = document.querySelector(`[data-block-id="${id}"] .block-content`);
  if (el) {
    el.focus();
    const len = el.value.length;
    el.setSelectionRange(len, len);
  }
}

function autoResize(ta) {
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';
}

// ── localStorage Save / Load ──────────────────────────────────────────────────

function toJSON() {
  return JSON.stringify({
    version: 1,
    title: state.title,
    author: state.author,
    blocks: state.blocks,
  }, null, 2);
}

function fromJSON(json) {
  const data = JSON.parse(json);
  state.title  = data.title  || 'ಅಶೀರ್ಷಿಕೆ';
  state.author = data.author || '';
  state.blocks = data.blocks || [];
  state.idSeq  = state.blocks.length + 1;
  state.dirty  = false;
  document.getElementById('titleInput').value     = state.title;
  document.getElementById('pageTitleInput').value = state.title;
  document.getElementById('pageAuthorInput').value = state.author;
}

function saveToStorage() {
  const key = 'wb_' + state.title.replace(/\s+/g, '_');
  state.currentScriptKey = key;
  localStorage.setItem(key, toJSON());
  // Save index
  const idx = JSON.parse(localStorage.getItem('wb_index') || '[]');
  if (!idx.includes(key)) { idx.push(key); localStorage.setItem('wb_index', JSON.stringify(idx)); }
  state.dirty = false;
  renderTitle();
  showToast('Saved ✓');
}

function loadFromStorage(key) {
  const json = localStorage.getItem(key);
  if (!json) return;
  fromJSON(json);
  state.currentScriptKey = key;
  render();
  hideOverlay('openOverlay');
}

function deleteFromStorage(key) {
  localStorage.removeItem(key);
  const idx = JSON.parse(localStorage.getItem('wb_index') || '[]').filter(k => k !== key);
  localStorage.setItem('wb_index', JSON.stringify(idx));
  renderOpenList();
}

function renderOpenList() {
  const idx = JSON.parse(localStorage.getItem('wb_index') || '[]');
  const container = document.getElementById('savedScriptsList');
  if (idx.length === 0) {
    container.innerHTML = '<div style="color:var(--text-faint);font-size:12px;padding:8px">No saved scripts yet.</div>';
    return;
  }
  container.innerHTML = idx.map(key => {
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    return `<div class="saved-script-item" data-key="${key}">
      <div>
        <div class="saved-script-name">${data.title || key}</div>
        <div class="saved-script-date">${data.blocks?.length || 0} blocks</div>
      </div>
      <span class="saved-script-del" data-del="${key}">×</span>
    </div>`;
  }).join('');

  container.querySelectorAll('.saved-script-item').forEach(item => {
    item.addEventListener('click', e => {
      if (e.target.dataset.del) { deleteFromStorage(e.target.dataset.del); return; }
      loadFromStorage(item.dataset.key);
    });
  });
}

// ── New Script ────────────────────────────────────────────────────────────────

function newScript() {
  if (state.dirty && !confirm('You have unsaved changes. Start a new script?')) return;
  state.title  = 'ಅಶೀರ್ಷಿಕೆ';
  state.author = '';
  state.blocks = [];
  state.idSeq  = 0;
  state.dirty  = false;
  state.currentScriptKey = null;
  document.getElementById('titleInput').value      = state.title;
  document.getElementById('pageTitleInput').value  = state.title;
  document.getElementById('pageAuthorInput').value = '';
  // Add starter blocks
  addBlock('scene', '');
  addBlock('action', '');
  render();
  setTimeout(() => focusBlock(state.blocks[0]?.id), 50);
}

// ── File Import / Export ──────────────────────────────────────────────────────

function exportFile() {
  const blob = new Blob([toJSON()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (state.title || 'screenplay') + '.wbs';
  a.click();
}

function importFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      fromJSON(e.target.result);
      state.dirty = false;
      render();
      hideOverlay('openOverlay');
    } catch {
      alert('Could not read file. Make sure it is a valid .wbs file.');
    }
  };
  reader.readAsText(file);
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function showToast(msg) {
  let toast = document.getElementById('wb-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'wb-toast';
    toast.style.cssText = 'position:fixed;bottom:40px;left:50%;transform:translateX(-50%);background:var(--accent);color:var(--bg);padding:8px 20px;border-radius:20px;font-size:13px;font-weight:500;z-index:999;transition:opacity 0.3s;font-family:"DM Sans",sans-serif';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 1800);
}

// ── Overlay Helpers ───────────────────────────────────────────────────────────

function showOverlay(id) { document.getElementById(id).classList.add('visible'); }
function hideOverlay(id) { document.getElementById(id).classList.remove('visible'); }

// ── Init ──────────────────────────────────────────────────────────────────────

function init() {
  // Load sample script
  fromJSON(JSON.stringify({
    version: 1,
    title: 'ಮನೆಗೆ ಮರಳಿ',
    author: 'ಬರೆದವರು:',
    blocks: [
      { id:'b1', type:'scene',      text:'INT. ಮನೆ — ಹಗಲು' },
      { id:'b2', type:'action',     text:'ರಾಮು (40) ಒಂದು ಹಳೆಯ ಕುರ್ಚಿಯ ಮೇಲೆ ಕುಳಿತಿದ್ದಾನೆ. ಮನೆ ಸಣ್ಣದಾಗಿದ್ದರೂ ಅಚ್ಚುಕಟ್ಟಾಗಿದೆ.' },
      { id:'b3', type:'character',  text:'ರಾಮು' },
      { id:'b4', type:'dialogue',   text:'ಅಮ್ಮ, ಊಟ ಆಯಿತಾ?' },
      { id:'b5', type:'character',  text:'ಅಮ್ಮ (O.S.)' },
      { id:'b6', type:'dialogue',   text:'ಇನ್ನೂ ಆಗಿಲ್ಲ. ಐದು ನಿಮಿಷ ತಡ್ಕೋ.' },
      { id:'b7', type:'action',     text:'ರಾಮು ಮೇಲೆದ್ದು ಕಿಟಕಿಯ ಬಳಿ ಹೋಗುತ್ತಾನೆ. ಹೊರಗೆ ಮಳೆ ಶುರುವಾಗಿದೆ.' },
      { id:'b8', type:'transition', text:'CUT TO:' },
      { id:'b9', type:'scene',      text:'EXT. ರಸ್ತೆ — ಸಂಜೆ' },
      { id:'b10',type:'action',     text:'ಮಳೆ ಬಿದ್ದ ನಂತರ ರಸ್ತೆ ನಿರ್ಜನವಾಗಿದೆ. ರಾಮು ಛತ್ರಿ ಹಿಡಿದು ನಡೆಯುತ್ತಿದ್ದಾನೆ.' },
    ]
  }));
  state.idSeq = 10;

  render();

  // Bind buttons
  document.getElementById('btnSave').onclick      = saveToStorage;
  document.getElementById('btnNew').onclick       = newScript;
  document.getElementById('btnExport').onclick    = () => { exportFile(); };
  document.getElementById('btnShortcuts').onclick = () => showOverlay('shortcutOverlay');
  document.getElementById('btnCloseShortcuts').onclick = () => hideOverlay('shortcutOverlay');
  document.getElementById('btnOpen').onclick      = () => { renderOpenList(); showOverlay('openOverlay'); };
  document.getElementById('btnCloseOpen').onclick = () => hideOverlay('openOverlay');
  document.getElementById('btnImportFile').onclick = () => document.getElementById('fileInput').click();
  document.getElementById('fileInput').onchange   = e => { if (e.target.files[0]) importFile(e.target.files[0]); };

  // Close overlays on backdrop click
  document.querySelectorAll('.shortcut-overlay').forEach(el => {
    el.addEventListener('click', e => { if (e.target === el) el.classList.remove('visible'); });
  });

  // Title sync
  document.getElementById('titleInput').addEventListener('input', e => {
    state.title = e.target.value;
    document.getElementById('pageTitleInput').value = e.target.value;
    state.dirty = true;
    renderTitle();
  });

  document.getElementById('pageTitleInput').addEventListener('input', e => {
    state.title = e.target.value;
    document.getElementById('titleInput').value = e.target.value;
    state.dirty = true;
    renderTitle();
  });

  document.getElementById('pageAuthorInput').addEventListener('input', e => {
    state.author = e.target.value;
    state.dirty = true;
  });

  // Block type panel
  document.querySelectorAll('.block-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (focusedBlockId) {
        updateBlock(focusedBlockId, { type: btn.dataset.type });
        render();
        setTimeout(() => focusBlock(focusedBlockId), 10);
      }
    });
  });

  // Global keyboard
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.shortcut-overlay.visible').forEach(el => el.classList.remove('visible'));
    }
  });

  // Warn before leaving with unsaved changes
  window.addEventListener('beforeunload', e => {
    if (state.dirty) { e.preventDefault(); e.returnValue = ''; }
  });

  // Export PDF = print
  document.getElementById('btnExport').addEventListener('click', () => {
    window.print();
  });
}

document.addEventListener('DOMContentLoaded', init);