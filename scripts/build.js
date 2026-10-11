// Build trang tĩnh cho GitHub Pages: node scripts/build.js
// - Đọc content/content.json, render ra dist/index.html (dùng lib/render.js)
// - Copy CSS/JS, ảnh đã upload (content/uploads) và trang admin
// - Đóng gói code render cho trang admin để xem trước ngay trong trình duyệt
const fs = require('fs');
const path = require('path');
const { normalizeContent } = require('../lib/schema');
const { renderPage } = require('../lib/render');
const VideoUtils = require('../public/js/video-utils');
const pkg = require('../package.json');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'dist');
const CONTENT_FILE = path.join(ROOT, 'content', 'content.json');

// Repo GitHub mà trang admin sẽ ghi vào. Trên GitHub Actions lấy tự động.
const [owner, repo] = (process.env.GITHUB_REPOSITORY || pkg.portfolio.repo).split('/');
const branch = process.env.GITHUB_REF_NAME || pkg.portfolio.branch || 'main';

const copyDir = (from, to, skip = () => false) => {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  for (const name of fs.readdirSync(from)) {
    if (skip(name)) continue;
    const src = path.join(from, name);
    const dst = path.join(to, name);
    if (fs.statSync(src).isDirectory()) copyDir(src, dst, skip);
    else fs.copyFileSync(src, dst);
  }
};

// Video YouTube nào có ảnh bìa HD (để trang không phải tải ảnh 404 rồi mới đổi)
async function checkYoutubeThumbs(content) {
  const status = new Map();
  if (typeof fetch !== 'function') return status;
  const ids = [...new Set(content.videos.map((v) => VideoUtils.parse(v.url)).filter((i) => i && i.provider === 'youtube').map((i) => i.id))];
  await Promise.all(ids.map(async (id) => {
    try {
      const r = await fetch(`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`, { method: 'HEAD', signal: AbortSignal.timeout(8000) });
      status.set(id, r.ok ? 'hd' : 'hq');
    } catch { /* để trình duyệt tự xử lý */ }
  }));
  return status;
}

// Gói các module CommonJS thành 1 file chạy trong trình duyệt (không cần bundler)
function bundle(modules, exportsCode) {
  const defs = Object.entries(modules)
    .map(([name, file]) => `defs[${JSON.stringify(name)}] = function (module, exports, require) {\n${fs.readFileSync(path.join(ROOT, file), 'utf8')}\n};`)
    .join('\n');
  return `/* Tự sinh bởi scripts/build.js — không sửa trực tiếp */
(function () {
var defs = {}, cache = {};
function req(name) {
  if (cache[name]) return cache[name].exports;
  if (!defs[name]) throw new Error('Không tìm thấy module ' + name);
  var m = (cache[name] = { exports: {} });
  defs[name](m, m.exports, req);
  return m.exports;
}
${defs}
${exportsCode}
})();
`;
}

async function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const content = normalizeContent(JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8')));
  const thumbs = await checkYoutubeThumbs(content);
  const version = Date.now().toString(36);

  // Trang chính
  fs.writeFileSync(path.join(OUT, 'index.html'), renderPage(content, { thumbs: (id) => thumbs.get(id), version }));
  fs.writeFileSync(path.join(OUT, '404.html'), '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=/"><title>Đang chuyển…</title><a href="/">Về trang chủ</a>');
  fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
  fs.writeFileSync(path.join(OUT, 'robots.txt'), 'User-agent: *\nDisallow: /admin/\n');

  copyDir(path.join(ROOT, 'public', 'css'), path.join(OUT, 'css'));
  copyDir(path.join(ROOT, 'public', 'js'), path.join(OUT, 'js'));
  copyDir(path.join(ROOT, 'content', 'uploads'), path.join(OUT, 'uploads'), (n) => n.startsWith('.'));

  // Trang admin
  const adminOut = path.join(OUT, 'admin');
  copyDir(path.join(ROOT, 'public', 'admin'), adminOut);
  const adminHtml = path.join(adminOut, 'index.html');
  fs.writeFileSync(adminHtml, fs.readFileSync(adminHtml, 'utf8').replace(/\{\{VERSION\}\}/g, version));
  fs.writeFileSync(path.join(adminOut, 'config.js'), `window.PORTFOLIO_CONFIG = ${JSON.stringify({
    owner, repo, branch, contentPath: 'content/content.json', uploadsPath: 'content/uploads',
  }, null, 2)};\n`);
  fs.writeFileSync(path.join(adminOut, 'portfolio.bundle.js'), bundle({
    './defaults': 'lib/defaults.js',
    './schema': 'lib/schema.js',
    './icons': 'lib/icons.js',
    '../public/js/video-utils': 'public/js/video-utils.js',
    './render': 'lib/render.js',
  }, `var schema = req('./schema');
window.VideoUtils = req('../public/js/video-utils');
window.Portfolio = {
  renderPage: req('./render').renderPage,
  normalizeContent: schema.normalizeContent,
  FONTS: schema.FONTS,
  ICONS: schema.ICONS,
  icon: req('./icons').icon,
};`));

  const files = [];
  (function walk(d) { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); fs.statSync(p).isDirectory() ? walk(p) : files.push(p); } })(OUT);
  console.log(`Build xong: ${files.length} file trong dist/ (repo admin: ${owner}/${repo}@${branch}, ảnh HD: ${[...thumbs.values()].filter((v) => v === 'hd').length}/${thumbs.size})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
