/* ===================================================
 * オールシェア(仮) — 資料プレビュービューア
 *
 * - serve.js を起動して /api/tree から動的ツリーを取得
 * - SSE (/api/events) でリアルタイム更新に対応
 * - ファイル追加・削除・リネーム時にサイドバーが自動更新
 * =================================================== */

/* ===== DOM 参照 ===== */
const $ = id => document.getElementById(id);
const fileTreeEl     = $('fileTree');
const contentEl      = $('content');
const documentEl     = $('document');
const welcomeEl      = $('welcome');
const errorEl        = $('error');
const errorMsgEl     = $('errorMessage');
const markdownBody   = $('markdownBody');
const breadcrumbEl   = $('breadcrumb');
const sidebar        = $('sidebar');
const sidebarOverlay = $('sidebarOverlay');
const sidebarToggle  = $('sidebarToggle');

/* ===== 状態 ===== */
let currentTree  = null;          // 最新のツリー
let activePath   = null;          // 現在開いているファイルパス
let isRendering  = false;         // レンダリング中フラグ

/* ===== ツリー描画 ===== */
function renderTree(container, nodes, basePath) {
  container.innerHTML = '';
  const ul = document.createElement('ul');
  ul.className = 'tree';
  container.appendChild(ul);

  for (const node of nodes) {
    const li = document.createElement('li');
    const fullPath = basePath ? `${basePath}/${node.name}` : node.name;

    if (node.type === 'directory') {
      // ---- ディレクトリ ----
      const label = document.createElement('span');
      label.className = 'tree-label folder-label';

      const toggle = document.createElement('button');
      toggle.className = 'tree-toggle';
      toggle.textContent = '▶';
      // 空ディレクトリは開閉不可
      if (node.children.length === 0) {
        toggle.style.visibility = 'hidden';
      }

      const icon = document.createElement('span');
      icon.className = 'folder-icon';
      icon.textContent = '📁';

      label.prepend(icon);
      label.prepend(toggle);
      label.append(` ${node.name}`);

      const childrenContainer = document.createElement('ul');
      childrenContainer.className = 'children';

      if (node.children.length > 0) {
        renderTree(childrenContainer, node.children, fullPath);
      }

      // 開閉処理（ラベル全体で動作）
      function toggleFolder() {
        toggle.classList.toggle('expanded');
        childrenContainer.classList.toggle('open');
      }

      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFolder();
      });

      label.addEventListener('click', toggleFolder);
      label.style.cursor = 'pointer';

      li.appendChild(label);
      li.appendChild(childrenContainer);

      // デフォルトで materials 直下だけ開く
      if (basePath === 'materials') {
        toggle.classList.add('expanded');
        childrenContainer.classList.add('open');
      }
    } else {
      // ---- ファイル ----
      const isMarkdown = node.name.endsWith('.md');
      const link = document.createElement('a');
      link.href = '#';
      link.dataset.path = fullPath;

      const icon = document.createElement('span');
      icon.className = 'file-icon';
      icon.textContent = isMarkdown ? '📄' : '🔷';

      link.prepend(icon);
      link.append(` ${node.name}`);

      link.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo(fullPath);
      });

      // 現在アクティブなファイルならハイライト
      if (fullPath === activePath) {
        link.classList.add('active');
      }

      li.appendChild(link);
    }

    ul.appendChild(li);
  }
}

/* ===== ツリーリフレッシュ（開いていた階層を維持） ===== */
function refreshTree(tree) {
  currentTree = tree;
  const parent = fileTreeEl.parentNode;
  renderTree(fileTreeEl, tree.children, tree.name);
}

/* ===== サーバーからツリーを取得 ===== */
async function fetchTree() {
  try {
    const res = await fetch('/api/tree');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const tree = await res.json();
    refreshTree(tree);
  } catch (err) {
    console.error('ツリー取得失敗:', err);
    // エラー表示は行わず、ファイル単位で個別対応
  }
}

/* ===== SSE でリアルタイム更新 ===== */
function connectSSE() {
  const es = new EventSource('/api/events');

  es.addEventListener('open', () => {
    console.log('SSE 接続確立');
  });

  es.addEventListener('message', (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.type === 'tree-update' && data.tree) {
        console.log('ツリー更新を検出 → 再描画');
        refreshTree(data.tree);
      }
    } catch (_) { /* ignore malformed messages */ }
  });

  es.addEventListener('error', () => {
    // 接続断 → 3秒後にポーリングで復旧
    console.warn('SSE 切断、ポーリングで復旧待ち...');
    es.close();
    setTimeout(() => {
      fetchTree();
      connectSSE();
    }, 3000);
  });
}

/* ===== ナビゲーション ===== */
async function navigateTo(filePath) {
  activePath = filePath;

  // サイドバーのアクティブ表示更新
  document.querySelectorAll('.tree a.active').forEach(el => el.classList.remove('active'));
  const activeLink = document.querySelector(`.tree a[data-path="${filePath}"]`);
  if (activeLink) activeLink.classList.add('active');

  // モバイル: サイドバーを閉じる
  closeSidebar();

  // ハッシュ更新
  const hash = filePath;
  if (window.location.hash !== `#${hash}`) {
    history.pushState(null, '', `#${hash}`);
  }

  // 読み込み
  // filePath は "materials/architecture/system/features.md" の形
  const base = filePath.startsWith('materials/') ? '' : 'materials/';
  const fetchUrl = `/${base}${filePath}`;

  welcomeEl.hidden = true;
  errorEl.hidden = true;

  try {
    const res = await fetch(fetchUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const ext = filePath.split('.').pop().toLowerCase();

    if (ext === 'md') {
      const text = await res.text();
      const html = marked.parse(text);

      // breadcrumb
      const parts = filePath.replace(/\.md$/, '').split('/');
      const fileName = parts.pop();
      breadcrumbEl.innerHTML = `
        <a href="#/">materials</a>
        ${parts.map(p => `<span>/</span><span>${p}</span>`).join('')}
        <span>/</span><span>${fileName}</span>
      `;

      markdownBody.innerHTML = html;

      // コードハイライト（hljs が読み込めていれば実行、失敗しても表示は続行）
      try {
        if (typeof hljs !== 'undefined') {
          markdownBody.querySelectorAll('pre code').forEach(block => {
            // Mermaid ブロックは hljs でハイライトしない
            if (!block.classList.contains('language-mermaid')) {
              hljs.highlightElement(block);
            }
          });
        }
      } catch (_) {
        console.warn('hljs ハイライト失敗（CDN未到達かも）');
      }

      // mermaid ダイアグラム描画
      try {
        if (typeof mermaid !== 'undefined') {
          // marked が生成した <pre><code class="language-mermaid"> を
          // <div class="mermaid"> に置き換える
          markdownBody.querySelectorAll('pre code.language-mermaid').forEach(block => {
            const pre = block.parentElement;
            const div = document.createElement('div');
            div.className = 'mermaid';
            div.textContent = block.textContent;
            pre.replaceWith(div);
          });

          // 描画
          if (markdownBody.querySelectorAll('.mermaid').length > 0) {
            mermaid.run({ nodes: markdownBody.querySelectorAll('.mermaid') });
          }
        }
      } catch (_) {
        console.warn('mermaid 描画失敗（CDN未到達か構文エラー）');
      }

      documentEl.hidden = false;
    } else {
      // Markdown 以外 → ダウンロード案内
      breadcrumbEl.innerHTML = `
        <a href="#/">materials</a>
        <span>/</span><span>${filePath}</span>
      `;
      markdownBody.innerHTML = `
        <div style="text-align:center;padding:40px 0">
          <p style="font-size:3rem;margin-bottom:16px">🔷</p>
          <p><strong>${filePath}</strong> はプレビューに対応していない形式です。</p>
          <p style="margin-top:12px">
            <a href="${fetchUrl}" download style="display:inline-flex;align-items:center;gap:6px;
               padding:10px 24px;background:var(--color-accent);color:#fff;border-radius:6px;
               text-decoration:none;font-weight:600;">
              ⬇ ダウンロード
            </a>
          </p>
        </div>
      `;
      documentEl.hidden = false;
    }
  } catch (err) {
    console.error(err);
    errorMsgEl.textContent = err.message;
    errorEl.hidden = false;
    documentEl.hidden = true;
  }
}

/* ===== ホームに戻る ===== */
function showHome() {
  activePath = null;
  document.querySelectorAll('.tree a.active').forEach(el => el.classList.remove('active'));
  welcomeEl.hidden = false;
  errorEl.hidden = true;
  documentEl.hidden = true;
  if (window.location.hash !== '#/') {
    history.pushState(null, '', '#/');
  }
}

/* ===== サイドバー開閉 ===== */
function openSidebar() {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

sidebarToggle.addEventListener('click', () => {
  sidebar.classList.toggle('open');
  sidebarOverlay.classList.toggle('active');
  if (sidebar.classList.contains('open')) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
});

sidebarOverlay.addEventListener('click', closeSidebar);

/* ===== キーボードショートカット ===== */
document.addEventListener('keydown', (e) => {
  // Ctrl+K / Cmd+K でサイドバートグル
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    sidebarToggle.click();
  }
});

/* ===== ハッシュルーティング ===== */
function handleHash() {
  const hash = window.location.hash.slice(1) || '/';
  if (hash === '/') {
    showHome();
    return;
  }
  navigateTo(hash);
}

window.addEventListener('hashchange', handleHash);
window.addEventListener('popstate', handleHash);

/* ===== 初期化 ===== */
document.addEventListener('DOMContentLoaded', async () => {
  // marked 設定
  marked.setOptions({ breaks: true, gfm: true });

  // mermaid 初期化（テーマは白背景のデフォルト）
  try {
    if (typeof mermaid !== 'undefined') {
      mermaid.initialize({ startOnLoad: false, theme: 'default' });
    }
  } catch (_) {}

  // ツリーを取得して描画
  await fetchTree();

  // SSE 接続（ツリーのリアルタイム更新）
  connectSSE();

  // 初回ルーティング
  handleHash();

  // Safari などの bfcache 対策
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) handleHash();
  });
});
