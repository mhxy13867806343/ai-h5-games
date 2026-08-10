/* ============================================================
   AI H5 游戏大厅 (index.html) - 外部独立 JS 业务逻辑
   ============================================================ */

// Folder Filtering Logic
function filterFolder(folder) {
  const cards = document.querySelectorAll('.card');
  const tabs = document.querySelectorAll('.folder-tab');

  tabs.forEach(tab => {
    if (tab.getAttribute('onclick') && tab.getAttribute('onclick').includes(folder)) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  cards.forEach(card => {
    if (folder === 'all' || card.dataset.folder === folder) {
      card.style.display = 'flex';
    } else {
      card.style.display = 'none';
    }
  });
}

// Layout Switching Logic
function switchLayout(mode) {
  const container = document.getElementById('cards-container');
  const buttons = document.querySelectorAll('.layout-btn[data-layout]');
  const wrap = document.getElementById('main-wrap');

  if (!container) return;

  if (mode === 'random') {
    container.className = 'grid mode-random';
    const cards = Array.from(container.children);
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      container.appendChild(cards[j]);
    }
    cards.forEach(card => {
      card.classList.remove('span-wide', 'span-tall');
      const rand = Math.random();
      if (rand > 0.75) card.classList.add('span-wide');
      else if (rand > 0.6) card.classList.add('span-tall');
    });
    buttons.forEach(btn => btn.classList.remove('active'));
    const randBtn = document.querySelector('.layout-btn[data-layout="random"]');
    if (randBtn) randBtn.classList.add('active');
    return;
  }

  const cards = Array.from(container.children);
  cards.forEach(card => card.classList.remove('span-wide', 'span-tall'));
  container.className = 'grid mode-' + mode;

  buttons.forEach(btn => {
    if (btn.dataset.layout === mode) btn.classList.add('active');
    else btn.classList.remove('active');
  });

  if (mode === 'hero' || mode === 'list') wrap.style.maxWidth = '1300px';
  else wrap.style.maxWidth = '1200px';

  localStorage.setItem('h5_layout_mode', mode);
}

// Open Share Modal for Card
function openShareModal(btn) {
  if (window.ShareHelper) {
    ShareHelper.open(btn);
  }
}

// Open Share Modal for Entire Hall
function openHallShare() {
  if (window.ShareHelper) {
    ShareHelper.open({
      id: 'hall',
      name: 'AI H5 网页游戏复刻大厅',
      url: 'index.html'
    });
  }
}

// Open Game Mini Preview Layer
function openGamePreview(btn) {
  const card = btn.closest('.card');
  if (!card) return;
  const url = card.dataset.url;
  const previewBody = card.querySelector('.preview-body');
  if (url && previewBody) {
    if (!previewBody.querySelector('iframe')) {
      const iframe = document.createElement('iframe');
      iframe.className = 'preview-iframe';
      iframe.src = url;
      previewBody.appendChild(iframe);
    }
    card.classList.add('preview-active');
  }
}

// Close Game Mini Preview Layer
function closePreview(btn) {
  const card = btn.closest('.card');
  if (card) {
    card.classList.remove('preview-active');
    const previewBody = card.querySelector('.preview-body');
    if (previewBody) previewBody.innerHTML = '';
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const savedMode = localStorage.getItem('h5_layout_mode') || 'grid';
  switchLayout(savedMode);
});

function openCodeModal(id, name, htmlUrl, cssUrl, jsUrl) {
  if (window.CodeViewerDownloader) {
    CodeViewerDownloader.open({ id, name, htmlUrl, cssUrl, jsUrl, folder: id });
  }
}

function downloadZip(id, name, htmlUrl, cssUrl, jsUrl) {
  if (window.CodeViewerDownloader) {
    CodeViewerDownloader.downloadZip({ id, name, htmlUrl, cssUrl, jsUrl });
  }
}
