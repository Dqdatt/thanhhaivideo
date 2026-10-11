require('./lib/env').load();

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');

const store = require('./lib/store');
const auth = require('./lib/auth');
const { renderPage } = require('./lib/render');
const icons = require('./lib/icons');
const VideoUtils = require('./public/js/video-utils');
const thumbs = require('./lib/thumbs');

const PORT = Number(process.env.PORT) || 3000;
const MAX_VIDEO_MB = Number(process.env.MAX_VIDEO_MB) || 200;

auth.ensureRootUser();
thumbs.warm(store.getContent());

const app = express();
app.disable('x-powered-by');
// Khi chạy sau Nginx/Caddy/Cloudflare để nhận đúng HTTPS và IP thật
app.set('trust proxy', process.env.TRUST_PROXY || 'loopback');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});
app.use(express.json({ limit: '2mb' }));

/* ---------------- Trang public ---------------- */

app.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.type('html').send(renderPage(store.getContent()));
});

app.use('/uploads', express.static(store.UPLOAD_DIR, { maxAge: '30d', immutable: true }));
// no-cache: trình duyệt luôn hỏi lại server (dùng ETag), cập nhật code là thấy ngay
app.use(express.static(path.join(__dirname, 'public'), { index: false, setHeaders: (res) => res.setHeader('Cache-Control', 'no-cache') }));
app.get(['/admin', '/admin/'], (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

/* ---------------- Đăng nhập ---------------- */

app.post('/api/login', (req, res) => {
  const ip = req.ip;
  if (auth.loginRateLimited(ip)) return res.status(429).json({ error: 'Sai quá nhiều lần, thử lại sau 15 phút' });
  const { username, password } = req.body || {};
  const user = auth.loadUsers().find((u) => u.username.toLowerCase() === String(username || '').toLowerCase());
  if (!user || !auth.verifyPassword(password, user.password)) {
    auth.recordFailedLogin(ip);
    return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu' });
  }
  auth.clearFailedLogins(ip);
  auth.setSessionCookie(req, res, user);
  res.json({ user: auth.publicUser(user) });
});

app.post('/api/logout', (req, res) => {
  auth.clearSessionCookie(res);
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  const user = auth.currentUser(req);
  res.json({ user: user ? auth.publicUser(user) : null });
});

/* ---------------- API quản trị (cần đăng nhập) ---------------- */

const admin = express.Router();
admin.use(auth.requireAuth);
admin.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

admin.get('/meta', (req, res) => {
  const iconSvgs = {};
  store.ICONS.forEach((n) => (iconSvgs[n] = icons.icon(n, 22)));
  res.json({ fonts: store.FONTS, icons: iconSvgs, sectionTypes: store.SECTION_TYPES, maxVideoMb: MAX_VIDEO_MB });
});

admin.get('/content', (req, res) => res.json(store.getContent()));

// Lấy tiêu đề video tự động khi dán link (chỉ gọi tới các endpoint oEmbed cố định)
const OEMBED = {
  youtube: 'https://www.youtube.com/oembed?format=json&url=',
  vimeo: 'https://vimeo.com/api/oembed.json?url=',
  tiktok: 'https://www.tiktok.com/oembed?url=',
};
admin.get('/oembed', async (req, res) => {
  const url = String(req.query.url || '');
  const info = VideoUtils.parse(url);
  if (!info || !OEMBED[info.provider] || typeof fetch !== 'function') return res.json({});
  try {
    const r = await fetch(OEMBED[info.provider] + encodeURIComponent(url), { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return res.json({});
    const j = await r.json();
    res.json({ title: String(j.title || '').slice(0, 160), author: String(j.author_name || '').slice(0, 80) });
  } catch {
    res.json({});
  }
});

admin.put('/content', (req, res) => {
  try {
    const saved = store.saveContent(req.body);
    thumbs.warm(saved);
    res.json(saved);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Không lưu được dữ liệu' });
  }
});

// Xem trước thay đổi chưa lưu
admin.post('/preview', (req, res) => {
  res.type('html').send(renderPage(store.normalizeContent(req.body), { preview: true }));
});

admin.get('/export', (req, res) => {
  res.setHeader('Content-Disposition', `attachment; filename="portfolio-backup-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json(store.getContent());
});

admin.post('/import', (req, res) => {
  if (!req.body || !Array.isArray(req.body.sections)) return res.status(400).json({ error: 'File không đúng định dạng' });
  res.json(store.saveContent(req.body));
});

admin.get('/backups', (req, res) => res.json(store.listBackups()));
admin.post('/backups/restore', (req, res) => {
  try {
    res.json(store.restoreBackup(req.body && req.body.name));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ---- Upload ảnh / video ---- */

const IMAGE_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/avif': '.avif', 'image/x-icon': '.ico', 'image/vnd.microsoft.icon': '.ico' };
const VIDEO_TYPES = { 'video/mp4': '.mp4', 'video/webm': '.webm', 'video/quicktime': '.mov' };

const upload = multer({
  storage: multer.diskStorage({
    destination: store.UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, `${Date.now().toString(36)}-${crypto.randomBytes(5).toString('hex')}${IMAGE_TYPES[file.mimetype] || VIDEO_TYPES[file.mimetype]}`),
  }),
  limits: { fileSize: MAX_VIDEO_MB * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (IMAGE_TYPES[file.mimetype] || VIDEO_TYPES[file.mimetype]) cb(null, true);
    else cb(new Error('Chỉ hỗ trợ ảnh JPG/PNG/WEBP/GIF/AVIF/ICO hoặc video MP4/WEBM/MOV'));
  },
});

admin.post('/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? `File vượt quá ${MAX_VIDEO_MB}MB` : err.message;
      return res.status(400).json({ error: msg });
    }
    if (!req.file) return res.status(400).json({ error: 'Chưa chọn file' });
    if (IMAGE_TYPES[req.file.mimetype] && req.file.size > 15 * 1024 * 1024) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Ảnh tối đa 15MB' });
    }
    res.json({ url: `/uploads/${req.file.filename}`, size: req.file.size, type: req.file.mimetype });
  });
});

admin.get('/uploads', (req, res) => {
  const files = fs
    .readdirSync(store.UPLOAD_DIR)
    .filter((f) => !f.startsWith('.'))
    .map((f) => {
      const st = fs.statSync(path.join(store.UPLOAD_DIR, f));
      return { name: f, url: `/uploads/${f}`, size: st.size, mtime: st.mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);
  res.json(files);
});

admin.delete('/uploads/:name', (req, res) => {
  const name = path.basename(req.params.name);
  const file = path.join(store.UPLOAD_DIR, name);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Không tìm thấy file' });
  fs.unlinkSync(file);
  res.json({ ok: true });
});

/* ---- Tài khoản ---- */

admin.put('/me/password', (req, res) => {
  const { current, next } = req.body || {};
  if (!auth.verifyPassword(current, req.user.password)) return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng' });
  try {
    const user = auth.setPassword(req.user.username, next);
    auth.setSessionCookie(req, res, user);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

admin.get('/users', auth.requireRoot, (req, res) => res.json(auth.loadUsers().map(auth.publicUser)));

admin.post('/users', auth.requireRoot, (req, res) => {
  try {
    const { username, password, role } = req.body || {};
    auth.createUser(username, password, role);
    res.json(auth.loadUsers().map(auth.publicUser));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

admin.put('/users/:username/password', auth.requireRoot, (req, res) => {
  try {
    auth.setPassword(req.params.username, req.body && req.body.password);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

admin.delete('/users/:username', auth.requireRoot, (req, res) => {
  if (req.params.username === req.user.username) return res.status(400).json({ error: 'Không thể tự xoá tài khoản đang đăng nhập' });
  try {
    auth.deleteUser(req.params.username);
    res.json(auth.loadUsers().map(auth.publicUser));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.use('/api/admin', admin);

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
app.use((req, res) => res.redirect('/'));

app.listen(PORT, () => {
  console.log(`Portfolio đang chạy: http://localhost:${PORT}`);
  console.log(`Trang quản trị:      http://localhost:${PORT}/admin`);
  console.log(`Dữ liệu lưu tại:     ${store.DATA_DIR}`);
});
