// Chuẩn hoá & kiểm tra dữ liệu nội dung (content.json).
// Dùng chung cho script build (Node) và trang admin (trình duyệt).
const defaults = require('./defaults');
const VideoUtils = require('../public/js/video-utils');

const str = (v, max = 2000) => (typeof v === 'string' ? v : v == null ? '' : String(v)).slice(0, max);
const num = (v, min, max, dflt) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : dflt;
};
const bool = (v) => v === true || v === 'true' || v === 1;
const oneOf = (v, list) => (list.includes(v) ? v : list[0]);
const color = (v, dflt) => (/^#[0-9a-f]{6}$/i.test(v) ? v : dflt);
const arr = (v, max, fn) => (Array.isArray(v) ? v.slice(0, max).map(fn) : []);
const id = (v) => (/^[\w-]{1,40}$/.test(v) ? v : Math.random().toString(36).slice(2, 12));

// "Biti's Hunter — TVC 2026" -> "bitis-hunter-tvc-2026" (dùng làm đường dẫn trang dự án)
const slugify = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');

const FONTS = ['Oswald', 'Montserrat', 'Poppins', 'Be Vietnam Pro', 'Playfair Display', 'Bebas Neue'];
const SECTION_TYPES = ['showreel', 'profile', 'portfolio', 'bts', 'contact'];
const ASPECTS = ['16:9', '9:16', '1:1', '4:5', '21:9'];
const SOCIALS = ['facebook', 'youtube', 'instagram', 'tiktok', 'behance', 'linkedin', 'x', 'zalo'];

// Mục của khối Hậu trường (chỉ ảnh): phiên bản đa định dạng, ảnh on-set / breakdown.
// Mục cũ chỉ có link video thì lấy ảnh bìa của video đó.
const itemImage = (it) => {
  const img = str(it && it.image, 1000);
  if (img || !it || !it.url) return img;
  const info = VideoUtils.parse(it.url);
  return (info && (info.thumbnailHd || info.thumbnail)) || '';
};
const formatItem = (it) => ({
  image: itemImage(it),
  label: str(it && it.label, 80),
  aspect: oneOf(it && it.aspect, ASPECTS),
});
const btsItem = (it) => ({
  group: str(it && it.group, 60),
  image: itemImage(it),
  caption: str(it && it.caption, 120),
});

const sectionData = {
  showreel: (d) => ({
    title: str(d.title, 80),
    subtitle: str(d.subtitle, 120),
    videoUrl: str(d.videoUrl, 1000),
    image: str(d.image, 1000),
  }),
  profile: (d) => ({
    image: str(d.image, 1000),
    title: str(d.title, 160),
    text: str(d.text, 3000),
    buttonText: str(d.buttonText, 60),
    buttonLink: str(d.buttonLink, 500),
    showContact: d.showContact === undefined ? true : bool(d.showContact),
    showSocials: d.showSocials === undefined ? true : bool(d.showSocials),
    stats: arr(d.stats, 4, (it) => ({ value: str(it && it.value, 12), label: str(it && it.label, 60) })),
  }),
  portfolio: (d) => ({
    title: str(d.title, 160),
    columns: num(d.columns, 1, 4, 3),
    aspect: oneOf(d.aspect, ['16:10', '16:9', '4:3', '1:1', '9:16']),
    showFilter: bool(d.showFilter),
    category: str(d.category, 60),
    limit: num(d.limit, 0, 200, 0),
  }),
  bts: (d) => ({
    title: str(d.title, 120),
    subtitle: str(d.subtitle, 120),
    timelineImage: str(d.timelineImage, 1000),
    beforeImage: str(d.beforeImage, 1000),
    afterImage: str(d.afterImage, 1000),
    beforeLabel: str(d.beforeLabel, 30),
    afterLabel: str(d.afterLabel, 30),
    formats: arr(d.formats, 8, formatItem),
    bts: arr(d.bts, 12, btsItem),
  }),
  contact: (d) => ({
    title: str(d.title, 160),
    text: str(d.text, 1000),
    showForm: d.showForm === undefined ? true : bool(d.showForm),
    buttonText: str(d.buttonText, 60),
  }),
};

const clone = (o) => JSON.parse(JSON.stringify(o));
const defaultSection = (type) => clone(defaults.sections.find((sec) => sec.type === type));

// Nội dung của các phiên bản bố cục trước -> bố cục hiện tại
function migrate(input) {
  if (!input || typeof input !== 'object' || !Array.isArray(input.sections)) return input;
  let out = input;
  if (!(Number(out.version) >= 2)) out = migrateV1(out);
  if (Number(out.version) < 3) out = migrateV2(out);
  return out;
}

// v1 (Banner, Dịch vụ, Giới thiệu, Đánh giá…) -> v2 (theo template)
function migrateV1(input) {
  const D = { showreel: defaultSection('showreel'), profile: defaultSection('profile'), contact: defaultSection('contact') };
  const s = { ...(input.settings || {}) };
  // Màu & font mặc định cũ -> mặc định mới (giữ nguyên nếu khách đã tự đổi)
  if (!s.accentColor || s.accentColor.toLowerCase() === '#ff9f1c') s.accentColor = defaults.settings.accentColor;
  if (!s.backgroundColor || s.backgroundColor.toLowerCase() === '#07070b') s.backgroundColor = defaults.settings.backgroundColor;
  if (!s.headingFont || s.headingFont === 'Montserrat') s.headingFont = defaults.settings.headingFont;

  const sections = [];
  for (const sec of input.sections) {
    if (!sec || typeof sec !== 'object') continue;
    const d = sec.data || {};
    if (sec.type === 'hero') {
      sections.push({ ...sec, type: 'showreel', data: { ...D.showreel.data, videoUrl: d.showreelUrl || '', image: d.image || '' } });
    } else if (sec.type === 'about') {
      sections.push({ ...sec, type: 'profile', data: { ...D.profile.data, image: d.image || '', title: d.title || '', text: d.text || '', buttonText: d.buttonText || D.profile.data.buttonText, buttonLink: d.buttonLink || '#contact' } });
    } else if (sec.type === 'contact') {
      sections.push({ ...sec, navLabel: sec.navLabel || D.contact.navLabel, data: { ...D.contact.data, title: d.title || D.contact.data.title, text: d.text || '' } });
    } else if (SECTION_TYPES.includes(sec.type)) {
      sections.push(sec);
    }
    // Khối Dịch vụ, Đánh giá: bỏ (không có trong template mới)
  }
  return { ...input, version: 2, settings: s, sections };
}

// v2 -> v3: phần hậu trường chuyển từ trang dự án ra khối "Behind the scenes" trên trang chủ,
// thay cho khối Đối tác & thương hiệu
function migrateV2(input) {
  const sec = defaultSection('bts');
  const src = (input.videos || []).find((v) => v && (v.timelineImage || (v.beforeImage && v.afterImage) || (v.formats || []).length || (v.bts || []).length));
  if (src) {
    const keys = ['timelineImage', 'beforeImage', 'afterImage', 'beforeLabel', 'afterLabel', 'formats', 'bts'];
    keys.forEach((k) => { sec.data[k] = src[k] || (Array.isArray(sec.data[k]) ? [] : ''); });
  }
  const sections = [];
  let placed = input.sections.some((x) => x && x.type === 'bts');
  for (const x of input.sections) {
    if (x && x.type === 'partners') {
      if (!placed) sections.push({ ...sec, enabled: x.enabled !== false });
      placed = true;
    } else sections.push(x);
  }
  if (!placed) {
    const at = sections.findIndex((x) => x && x.type === 'portfolio');
    sections.splice(at < 0 ? sections.length : at + 1, 0, sec);
  }
  return { ...input, version: 3, sections };
}

function normalizeContent(rawInput) {
  const input = migrate(rawInput);
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
    socials: Object.fromEntries(SOCIALS.map((k) => [k, str(socials[k], 500)])),
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

  // Mỗi video = một dự án, có trang riêng (video + thông tin dự án)
  const slugs = new Set();
  const videos = arr(input && input.videos, 500, (v) => {
    v = v || {};
    const vid = id(v.id);
    const want = slugify(v.slug) || slugify(v.title) || vid.toLowerCase();
    let slug = want;
    for (let n = 2; slugs.has(slug); n++) slug = `${want}-${n}`;
    slugs.add(slug);
    return {
      id: vid,
      slug,
      title: str(v.title, 160),
      description: str(v.description, 500),
      url: str(v.url, 1000),
      thumbnail: str(v.thumbnail, 1000),
      category: str(v.category, 60).trim(),
      // Danh mục con (ví dụ tên công ty trong TVC), chỉ có nghĩa khi có danh mục lớn
      subcategory: str(v.category, 60).trim() ? str(v.subcategory, 60).trim() : '',
      visible: bool(v.visible),
      client: str(v.client, 120),
      role: str(v.role, 120),
      software: str(v.software, 160),
      equipment: str(v.equipment, 160),
      year: str(v.year, 20),
      summary: str(v.summary, 3000),
    };
  });

  // Danh mục (bộ lọc trên trang chủ) theo thứ tự admin sắp xếp, mỗi danh mục có thể có danh mục con.
  // Danh mục / danh mục con đang được dự án dùng luôn có mặt. Dạng cũ: danh sách tên (chuỗi).
  const categories = [];
  const findCat = (name) => categories.find((c) => c.name === name);
  const addCat = (name, subs = []) => {
    if (!name) return;
    let c = findCat(name);
    if (!c) categories.push((c = { name, subs: [] }));
    subs.forEach((sub) => { if (sub && !c.subs.includes(sub)) c.subs.push(sub); });
  };
  arr(input && input.categories, 50, (c) => c).forEach((c) => {
    if (typeof c === 'string') return addCat(str(c, 60).trim());
    if (c && typeof c === 'object') addCat(str(c.name, 60).trim(), arr(c.subs, 50, (x) => str(x, 60).trim()));
  });
  videos.forEach((v) => addCat(v.category, [v.subcategory]));

  return { version: 3, settings, sections, categories, videos };
}

module.exports = { normalizeContent, slugify, FONTS, SECTION_TYPES, ASPECTS, SOCIALS };
