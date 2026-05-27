#!/usr/bin/env node
/**
 * doc/serve.js — 開発サーバー
 *
 * - 静的ファイル配信（src/ + materials/）
 * - materials/ の変更を自動検出して SSE でクライアントに通知
 * - /api/tree で動的ファイルツリーを JSON 返却
 *
 * 使い方:
 *   node serve.js          # デフォルト port=8080
 *   node serve.js 3000     # port 指定
 *   bun serve.js           # Bun でも可
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// ===== 設定 =====
const PORT = parseInt(process.argv[2], 10) || 8080;
const DOC_DIR = __dirname;                     // doc/
const SRC_DIR = path.join(DOC_DIR, 'src');     // doc/src/
const MATERIALS_DIR = path.join(DOC_DIR, 'materials'); // doc/materials/

// ===== MIME =====
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md':   'text/markdown; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
  '.wasm': 'application/wasm',
};

function mimeType(ext) {
  return MIME[ext] || 'application/octet-stream';
}

// ===== SSE クライアント管理 =====
const sseClients = [];

function broadcast(data) {
  const msg = `data: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(res => res.write(msg));
}

// ===== ファイルツリー生成（ディレクトリ優先＋アルファベット順） =====
function generateTree(dirPath) {
  const name = path.basename(dirPath);
  let entries;
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return { name, type: 'directory', children: [] };
  }

  const children = entries
    .filter(e => !e.name.startsWith('.')) // 隠しファイル除外
    .sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    })
    .map(e => {
      const full = path.join(dirPath, e.name);
      if (e.isDirectory()) {
        return generateTree(full);
      }
      return { name: e.name, type: 'file' };
    });

  return { name, type: 'directory', children };
}

// ===== ファイル監視（materials/ 以下の変更を検出） =====
let watchTimeout = null;

function watchMaterials() {
  try {
    fs.watch(MATERIALS_DIR, { recursive: true }, (eventType, filename) => {
      if (!filename || filename.startsWith('.')) return;

      // 短時間の連続変更をデバウンス
      if (watchTimeout) clearTimeout(watchTimeout);
      watchTimeout = setTimeout(() => {
        console.log(`  📄 変更検出: ${filename}`);
        try {
          const tree = generateTree(MATERIALS_DIR);
          broadcast({ type: 'tree-update', tree });
        } catch (_) { /* ignore */ }
      }, 200);
    });
    console.log('  👀 materials/ の変更を監視しています');
  } catch (e) {
    console.warn(`  ⚠ ファイル監視を開始できません: ${e.message}`);
  }
}

// ===== HTTP サーバー =====
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');

  // ----- SSE: リアルタイム通知 -----
  if (pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    res.write('data: {"type":"connected"}\n\n');
    sseClients.push(res);
    req.on('close', () => {
      sseClients.splice(sseClients.indexOf(res), 1);
    });
    return;
  }

  // ----- API: ファイルツリー -----
  if (pathname === '/api/tree') {
    try {
      const tree = generateTree(MATERIALS_DIR);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(tree));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // ----- 静的ファイル配信 -----
  let filePath;
  if (pathname === '/' || pathname === '') {
    filePath = path.join(SRC_DIR, 'index.html');
  } else if (pathname.startsWith('/materials/')) {
    // /materials/... → doc/materials/...
    filePath = path.join(DOC_DIR, decodeURIComponent(pathname).slice(1));
  } else {
    // /xxx → doc/src/xxx
    filePath = path.join(SRC_DIR, decodeURIComponent(pathname));
  }

  // セキュリティ: DOC_DIR の外には出さない
  if (!filePath.startsWith(DOC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mimeType(ext) });
    res.end(data);
  });
});

// ===== 起動 =====
server.listen(PORT, () => {
  console.log('');
  console.log('  ┌──────────────────────────────────────┐');
  console.log(`  │  🔗  http://localhost:${PORT}${' '.repeat(8 - String(PORT).length)}│`);
  console.log('  │  終了: Ctrl+C                        │');
  console.log('  └──────────────────────────────────────┘');
  console.log('');
  watchMaterials();
});
