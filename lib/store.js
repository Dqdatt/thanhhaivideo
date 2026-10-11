// Lưu dữ liệu bằng file JSON trong thư mục DATA_DIR (mặc định ./data).
// Ghi file kiểu atomic (ghi file tạm rồi rename) để không bị hỏng dữ liệu khi server tắt đột ngột.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const defaults = require('./defaults');

const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'data'));
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const CONTENT_FILE = path.join(DATA_DIR, 'content.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(BACKUP_DIR, { recursive: true });

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') console.error(`Không đọc được ${file}:`, err.message);
    return fallback;
  }
}

function writeJson(file, data) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

const clone = (o) => JSON.parse(JSON.stringify(o));

/* ---------- Chuẩn hoá dữ liệu khi lưu ---------- */

const str = (v, max = 2000) => (typeof v === 'string' ? v : v == null ? '' : String(v)).slice(0, max);
const num = (v, min, max, dflt) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : dflt;
};
const bool = (v) => v === true || v === 'true' || v === 1;
const oneOf = (v, list) => (list.includes(v) ? v : list[0]);
const color = (v, dflt) => (/^#[0-9a-f]{6}$/i.test(v) ? v : dflt);
const arr = (v, max, fn) => (Array.isArray(v) ? v.slice(0, max).map(fn) : []);
const id = (v) => (/^[\w-]{1,40}$/.test(v) ? v : crypto.randomBytes(5).toString('hex'));

const FONTS = ['Montserrat', 'Poppins', 'Be Vietnam Pro', 'Oswald', 'Playfair Display', 'Bebas Neue'];
const ICONS = ['film', 'users', 'camera', 'tag', 'scissors', 'mic', 'music', 'drone', 'palette', 'sparkles', 'monitor', 'play'];
const SECTION_TYPES = ['hero', 'services', 'about', 'portfolio', 'reviews', 'contact'];

const sectionData = {
  hero: (d) => ({
    titleLines: arr(d.titleLines, 5, (s) => str(s, 80)).filter(Boolean),
    buttonText: str(d.buttonText, 60),
    buttonLink: str(d.buttonLink, 500),
    showreelUrl: str(d.showreelUrl, 500),
    image: str(d.image, 1000),
    imagePosition: oneOf(d.imagePosition, ['right', 'left']),
  }),
  services: (d) => ({
    intro: str(d.intro, 500),
    items: arr(d.items, 12, (it) => ({ icon: oneOf(it && it.icon, ICONS), title: str(it && it.title, 60) })),
  }),
  about: (d) => ({
    eyebrow: str(d.eyebrow, 80),
    title: str(d.title, 160),
    text: str(d.text, 3000),
    buttonText: str(d.buttonText, 60),
    buttonLink: str(d.buttonLink, 500),
    image: str(d.image, 1000),
    imagePosition: oneOf(d.imagePosition, ['left', 'right']),
  }),
  portfolio: (d) => ({
    eyebrow: str(d.eyebrow, 80),
    title: str(d.title, 160),
    columns: num(d.columns, 1, 4, 3),
    aspect: oneOf(d.aspect, ['16:9', '4:3', '1:1', '9:16']),
    showFilter: bool(d.showFilter),
    category: str(d.category, 60),
    limit: num(d.limit, 0, 200, 0),
  }),
  reviews: (d) => ({
    title: str(d.title, 160),
    rating: num(d.rating, 0, 5, 5),
    items: arr(d.items, 30, (it) => ({
      name: str(it && it.name, 80),
      role: str(it && it.role, 80),
      avatar: str(it && it.avatar, 1000),
      text: str(it && it.text, 800),
      rating: num(it && it.rating, 0, 5, 5),
    })),
  }),
  contact: (d) => ({
    eyebrow: str(d.eyebrow, 80),
    title: str(d.title, 160),
    text: str(d.text, 1000),
    buttonText: str(d.buttonText, 60),
  }),
};

function normalizeContent(input) {
  const s = (input && input.settings) || {};
  const socials = s.socials || {};
  const base = defaults.settings;
  const settings = {
    siteName: str(s.siteName, 120),
    logoText: str(s.logoText, 40),
    logoSub: str(s.logoSub, 40),
    logoImage: str(s.logoImage, 1000),
    favicon: str(s.favicon, 1000),
    metaTitle: str(s.metaTitle, 160),
    metaDescription: str(s.metaDescription, 320),
    ogImage: str(s.ogImage, 1000),
    theme: oneOf(s.theme, ['dark', 'light', 'auto']),
    themeToggle: s.themeToggle === undefined ? base.themeToggle : bool(s.themeToggle),
    accentColor: color(s.accentColor, base.accentColor),
    backgroundColor: color(s.backgroundColor, base.backgroundColor),
    lightBackgroundColor: color(s.lightBackgroundColor, base.lightBackgroundColor),
    headingFont: oneOf(s.headingFont, FONTS),
    contactButtonText: str(s.contactButtonText, 40),
    contactButtonLink: str(s.contactButtonLink, 500),
    email: str(s.email, 160),
    phone: str(s.phone, 40),
    address: str(s.address, 200),
    socials: {
      facebook: str(socials.facebook, 500),
      youtube: str(socials.youtube, 500),
      instagram: str(socials.instagram, 500),
      tiktok: str(socials.tiktok, 500),
      zalo: str(socials.zalo, 500),
    },
    footerText: str(s.footerText, 300),
  };

  const seen = new Set();
  const sections = arr(input && input.sections, 30, (sec) => sec || {})
    .filter((sec) => SECTION_TYPES.includes(sec.type))
    .map((sec) => {
      let sid = id(sec.id);
      while (seen.has(sid)) sid = id('');
      seen.add(sid);
      return {
        id: sid,
        type: sec.type,
        enabled: bool(sec.enabled),
        navLabel: str(sec.navLabel, 40),
        data: sectionData[sec.type](sec.data || {}),
      };
    });

  const videos = arr(input && input.videos, 500, (v) => ({
    id: id(v && v.id),
    title: str(v && v.title, 160),
    description: str(v && v.description, 500),
    url: str(v && v.url, 1000),
    thumbnail: str(v && v.thumbnail, 1000),
    category: str(v && v.category, 60).trim(),
    visible: bool(v && v.visible),
  }));

  return { settings, sections, videos };
}

/* ---------- Đọc / ghi nội dung ---------- */

let cache = null;

function getContent() {
  if (!cache) {
    const saved = readJson(CONTENT_FILE, null);
    cache = saved ? normalizeContent(saved) : normalizeContent(clone(defaults));
    if (!saved) writeJson(CONTENT_FILE, cache);
  }
  return cache;
}

function saveContent(input) {
  const next = normalizeContent(input);
  // Giữ 20 bản sao lưu gần nhất để khôi phục khi lỡ tay xoá
  if (fs.existsSync(CONTENT_FILE)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.copyFileSync(CONTENT_FILE, path.join(BACKUP_DIR, `content-${stamp}.json`));
    const old = fs.readdirSync(BACKUP_DIR).filter((f) => f.startsWith('content-')).sort();
    old.slice(0, Math.max(0, old.length - 20)).forEach((f) => fs.unlinkSync(path.join(BACKUP_DIR, f)));
  }
  writeJson(CONTENT_FILE, next);
  cache = next;
  return next;
}

function listBackups() {
  return fs.readdirSync(BACKUP_DIR).filter((f) => /^content-[\w-]+\.json$/.test(f)).sort().reverse();
}

function restoreBackup(name) {
  if (!/^content-[\w-]+\.json$/.test(name)) throw new Error('Tên bản sao lưu không hợp lệ');
  const data = readJson(path.join(BACKUP_DIR, name), null);
  if (!data) throw new Error('Không tìm thấy bản sao lưu');
  return saveContent(data);
}

function resetContent() {
  return saveContent(clone(defaults));
}

module.exports = {
  DATA_DIR,
  UPLOAD_DIR,
  FONTS,
  ICONS,
  SECTION_TYPES,
  readJson,
  writeJson,
  normalizeContent,
  getContent,
  saveContent,
  listBackups,
  restoreBackup,
  resetContent,
  newSectionData: (type) => sectionData[type]({}),
};
