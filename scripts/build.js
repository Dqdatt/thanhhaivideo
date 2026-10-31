// Build trang tĩnh cho GitHub Pages: node scripts/build.js
// - Lấy nội dung mới nhất từ Supabase (dự phòng: content/content.json), render ra dist/index.html
//   và trang chi tiết từng dự án dist/du-an/<slug>/index.html
// - Copy CSS/JS và trang admin
// - Đóng gói code render (js/portfolio.bundle.js) để trang web và admin render ngay trong trình duyệt
// Thêm --local để dùng content/content.json (không đọc Supabase, trang không tự tải nội dung mới)
const fs = require('fs');
const path = require('path');
const { normalizeContent } = require('../lib/schema');
const { renderPage, renderProjectPage, projectPath, isPublic } = require('../lib/render');
const VideoUtils = require('../public/js/video-utils');
const pkg = require('../package.json');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'dist');
const CONTENT_FILE = path.join(ROOT, 'content', 'content.json');
const LOCAL = process.argv.includes('--local');

// Cấu hình Supabase (publishable key là khoá công khai, dữ liệu được bảo vệ bằng RLS)
const config = {
  supabaseUrl: process.env.SUPABASE_URL || pkg.portfolio.supabaseUrl,
  supabaseKey: process.env.SUPABASE_KEY || pkg.portfolio.supabaseKey,
  bucket: pkg.portfolio.bucket || 'portfolio',
  loginDomain: pkg.portfolio.loginDomain || 'thanhhaivideo.com', // tên đăng nhập 'admin' = admin@<loginDomain> trên Supabase
};

// Nội dung mới nhất: Supabase -> content/content.json
async function loadContent() {
  if (!LOCAL && config.supabaseUrl && config.supabaseKey && typeof fetch === 'function') {
    try {
      const res = await fetch(`${config.supabaseUrl}/rest/v1/site_content?id=eq.1&select=content,updated_at`, {
        headers: { apikey: config.supabaseKey },
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const row = (await res.json())[0];
        if (row) return { content: row.content, version: row.updated_at, source: 'Supabase' };
      } else {
        console.warn(`Supabase trả lỗi ${res.status} — dùng content/content.json`);
      }
    } catch (err) {
      console.warn(`Không kết nối được Supabase (${err.message}) — dùng content/content.json`);
    }
  }
  return { content: JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8')), version: '', source: 'content/content.json' };
}

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

// Trang 404: GitHub Pages trả trang này cho mọi đường dẫn không có sẵn.
// Dự án thêm sau lần build gần nhất (/du-an/<slug>/) được render ngay từ nội dung trên Supabase;
// đường dẫn khác thì về trang chủ.
function notFoundPage(version) {
  const v = JSON.stringify(version);
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Đang tải…</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0e1012;color:#959ca2;font:14px system-ui,sans-serif}</style>
</head>
<body>
<p>Đang tải…</p>
<script>
(function () {
  var v = ${v};
  var path = location.pathname, at = path.indexOf('/du-an/');
  var root = at >= 0 ? path.slice(0, at + 1) : '/';
  var slug = at >= 0 ? decodeURIComponent(path.slice(at + 7).split('/')[0]) : '';
  function home() { location.replace(root); }
  function load(src) {
    return new Promise(function (ok, fail) {
      var s = document.createElement('script');
      s.src = root + src + '?v=' + v;
      s.onload = ok;
      s.onerror = fail;
      document.head.appendChild(s);
    });
  }
  if (!slug) return home();
  load('js/config.js').then(function () {
    var cfg = window.PORTFOLIO_CONFIG;
    return Promise.all([
      fetch(cfg.supabaseUrl + '/rest/v1/site_content?id=eq.1&select=content,updated_at', { headers: { apikey: cfg.supabaseKey }, cache: 'no-store' }).then(function (r) { return r.json(); }),
      load('js/portfolio.bundle.js'),
    ]);
  }).then(function (res) {
    var row = res[0] && res[0][0];
    var P = window.Portfolio;
    var html = row && P.renderProjectPage(P.normalizeContent(row.content), slug, { base: root, live: true, contentVersion: row.updated_at, version: v });
    if (!html) return home();
    document.open();
    document.write(html);
    document.close();
  }).catch(home);
})();
</script>
</body>
</html>
`;
}

async function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const loaded = await loadContent();
  const content = normalizeContent(loaded.content);
  const thumbs = await checkYoutubeThumbs(content);
  const version = Date.now().toString(36);

  // Trang chính (live: khi mở trang sẽ kiểm tra Supabase có bản mới hơn không)
  const opts = { thumbs: (id) => thumbs.get(id), version, live: !LOCAL, contentVersion: loaded.version };
  fs.writeFileSync(path.join(OUT, 'index.html'), renderPage(content, opts));
  // Trang chi tiết từng dự án (base ../../ để dùng chung css/js ở gốc)
  const projects = content.videos.filter(isPublic);
  for (const p of projects) {
    const dir = path.join(OUT, decodeURIComponent(projectPath(p)));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), renderProjectPage(content, p.slug, { ...opts, base: '../../' }));
  }
  fs.writeFileSync(path.join(OUT, '404.html'), notFoundPage(version));
  fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
  fs.writeFileSync(path.join(OUT, 'robots.txt'), 'User-agent: *\nDisallow: /admin/\n');

  copyDir(path.join(ROOT, 'public', 'css'), path.join(OUT, 'css'));
  copyDir(path.join(ROOT, 'public', 'js'), path.join(OUT, 'js'));
  copyDir(path.join(ROOT, 'content', 'uploads'), path.join(OUT, 'uploads'), (n) => n.startsWith('.'));
  fs.writeFileSync(path.join(OUT, 'js', 'config.js'), `window.PORTFOLIO_CONFIG = ${JSON.stringify(config, null, 2)};\n`);

  // Trang admin
  const adminOut = path.join(OUT, 'admin');
  copyDir(path.join(ROOT, 'public', 'admin'), adminOut);
  const adminHtml = path.join(adminOut, 'index.html');
  fs.writeFileSync(adminHtml, fs.readFileSync(adminHtml, 'utf8').replace(/\{\{VERSION\}\}/g, version));
  fs.writeFileSync(path.join(OUT, 'js', 'portfolio.bundle.js'), bundle({
    './defaults': 'lib/defaults.js',
    './schema': 'lib/schema.js',
    './icons': 'lib/icons.js',
    '../public/js/video-utils': 'public/js/video-utils.js',
    './render': 'lib/render.js',
  }, `var schema = req('./schema');
var render = req('./render');
window.VideoUtils = req('../public/js/video-utils');
window.Portfolio = {
  renderPage: render.renderPage,
  renderProjectPage: render.renderProjectPage,
  normalizeContent: schema.normalizeContent,
  slugify: schema.slugify,
  FONTS: schema.FONTS,
  ASPECTS: schema.ASPECTS,
  SOCIALS: schema.SOCIALS,
  icon: req('./icons').icon,
};`));

  const files = [];
  (function walk(d) { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); fs.statSync(p).isDirectory() ? walk(p) : files.push(p); } })(OUT);
  console.log(`Build xong: ${files.length} file trong dist/, ${projects.length} trang dự án (nội dung từ ${loaded.source}, ảnh HD: ${[...thumbs.values()].filter((v) => v === 'hd').length}/${thumbs.size})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
