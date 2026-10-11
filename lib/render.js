// Render trang public phía server (tốt cho SEO, không bị nháy trang).
// Mọi nội dung đều được escape để khách nhập gì cũng không phá được trang.

const VideoUtils = require('../public/js/video-utils');
const { icon } = require('./icons');
const thumbs = require('./thumbs');

const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Chỉ cho phép link an toàn (chặn javascript: ...)
function safeUrl(u, fallback = '#') {
  const url = String(u || '').trim();
  if (!url) return fallback;
  if (/^(https?:|mailto:|tel:)/i.test(url) || /^[#/]/.test(url)) return url;
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(url)) return `https://${url}`;
  return fallback;
}
const safeImg = (u) => {
  const url = String(u || '').trim();
  return /^(https?:\/\/|\/uploads\/)/i.test(url) ? url : '';
};

const nl2br = (s) => esc(s).replace(/\n/g, '<br>');
const isExternal = (u) => /^https?:/i.test(u);
const linkAttrs = (u) => (isExternal(u) ? ' target="_blank" rel="noopener"' : '');
const ASPECT = { '16:9': '16 / 9', '4:3': '4 / 3', '1:1': '1 / 1', '9:16': '9 / 16' };

function stars(n) {
  return `<div class="stars" aria-label="${n}/5">${'<span>★</span>'.repeat(n)}${'<span class="off">★</span>'.repeat(5 - n)}</div>`;
}

function videoAttrs(url) {
  const info = VideoUtils.parse(url);
  if (!info) {
    const link = safeUrl(url, '');
    return link ? { attrs: ` data-link="${esc(link)}"`, info: null } : { attrs: '', info: null };
  }
  return {
    attrs: ` data-embed="${esc(info.embed)}" data-provider="${info.provider}"${info.vertical ? ' data-vertical="1"' : ''}`,
    info,
  };
}

/* ---------------- Các khối (section) ---------------- */

function hero(sec) {
  const d = sec.data;
  const img = safeImg(d.image);
  const reel = d.showreelUrl ? videoAttrs(d.showreelUrl) : null;
  const btn = safeUrl(d.buttonLink);
  return `
<section class="hero hero--img-${d.imagePosition}" id="${esc(sec.id)}">
  <div class="container hero__inner">
    <div class="hero__text reveal">
      <h1 class="hero__title">${d.titleLines.map((l, i) => `<span class="hero__line hero__line--${i % 3}">${esc(l)}</span>`).join('')}</h1>
      <div class="hero__actions">
        ${d.buttonText ? `<a class="btn btn--accent" href="${esc(btn)}"${linkAttrs(btn)}>${esc(d.buttonText)}</a>` : ''}
        ${reel && reel.attrs ? `<button class="play-btn js-video" type="button"${reel.attrs} aria-label="Xem showreel">${icon('triangle', 20)}</button>` : ''}
      </div>
    </div>
    ${img ? `<div class="hero__media reveal"><img src="${esc(img)}" alt="" fetchpriority="high"></div>` : ''}
  </div>
</section>`;
}

function services(sec) {
  const d = sec.data;
  return `
<section class="services" id="${esc(sec.id)}">
  <div class="container services__inner reveal">
    ${d.intro ? `<p class="services__intro">${nl2br(d.intro)}</p>` : ''}
    <ul class="services__list" style="--count:${Math.max(1, d.items.length)}">
      ${d.items.map((it) => `<li class="service">${icon(it.icon, 30)}<span>${esc(it.title)}</span></li>`).join('')}
    </ul>
  </div>
</section>`;
}

function about(sec) {
  const d = sec.data;
  const img = safeImg(d.image);
  const btn = safeUrl(d.buttonLink);
  return `
<section class="about about--img-${d.imagePosition}${img ? '' : ' about--noimg'}" id="${esc(sec.id)}">
  <div class="container about__inner">
    ${img ? `<div class="about__media reveal"><img src="${esc(img)}" alt="" loading="lazy"></div>` : ''}
    <div class="about__text reveal">
      ${d.eyebrow ? `<p class="eyebrow">${esc(d.eyebrow)}</p>` : ''}
      ${d.title ? `<h2 class="h2">${esc(d.title)}</h2>` : ''}
      ${d.text ? `<p class="about__body">${nl2br(d.text)}</p>` : ''}
      ${d.buttonText ? `<a class="btn btn--accent" href="${esc(btn)}"${linkAttrs(btn)}>${esc(d.buttonText)}</a>` : ''}
    </div>
  </div>
</section>`;
}

function videoCard(v, aspect) {
  const { attrs, info } = videoAttrs(v.url);
  const custom = safeImg(v.thumbnail);
  const yt = !custom && info && info.thumbnailHd;
  const hd = yt ? thumbs.status(info.id) : null;
  let thumb = custom || (info && info.thumbnail) || '';
  let extra = '';
  if (hd === 'hd') thumb = info.thumbnailHd;
  // Ảnh thường của YouTube có viền đen -> class lb phóng to để cắt viền
  else if (hd === 'hq') extra = ' class="lb"';
  // Chưa kiểm tra xong (server vừa khởi động): thử ảnh HD, lỗi thì tự chuyển
  else if (yt) {
    thumb = info.thumbnailHd;
    extra = ` data-fallback="${esc(info.thumbnail)}" onload="thumbFix(this)" onerror="thumbFix(this,1)"`;
  }
  return `
    <article class="card reveal" data-cat="${esc(v.category)}">
      <button class="card__btn js-video" type="button"${attrs} style="aspect-ratio:${aspect}" aria-label="Xem video ${esc(v.title)}">
        ${thumb ? `<img src="${esc(thumb)}" alt="" loading="lazy"${extra}>` : `<span class="card__ph">${icon('film', 40)}</span>`}
        <span class="card__shade"></span>
        <span class="card__play">${icon('triangle', 20)}</span>
        <span class="card__meta">
          <strong>${esc(v.title)}</strong>
          ${v.description ? `<small>${esc(v.description)}</small>` : ''}
        </span>
      </button>
    </article>`;
}

function portfolio(sec, content) {
  const d = sec.data;
  let list = content.videos.filter((v) => v.visible && v.url);
  if (d.category) list = list.filter((v) => v.category.toLowerCase() === d.category.toLowerCase());
  if (d.limit) list = list.slice(0, d.limit);
  const cats = [...new Set(list.map((v) => v.category).filter(Boolean))];
  const aspect = ASPECT[d.aspect] || ASPECT['16:9'];
  return `
<section class="portfolio" id="${esc(sec.id)}">
  <div class="container">
    <header class="section-head reveal">
      ${d.eyebrow ? `<p class="eyebrow">${esc(d.eyebrow)}</p>` : ''}
      ${d.title ? `<h2 class="h2">${esc(d.title)}</h2>` : ''}
    </header>
    ${d.showFilter && cats.length > 1 ? `
    <div class="filters reveal" role="tablist">
      <button class="filter is-active" type="button" data-filter="">Tất cả</button>
      ${cats.map((c) => `<button class="filter" type="button" data-filter="${esc(c)}">${esc(c)}</button>`).join('')}
    </div>` : ''}
    <div class="grid" style="--cols:${d.columns}">
      ${list.length ? list.map((v) => videoCard(v, aspect)).join('') : '<p class="empty">Chưa có video nào.</p>'}
    </div>
  </div>
</section>`;
}

// Vị trí cố định cho các avatar bay quanh tiêu đề (% left, % top, kích thước px)
// Chỉ đặt ở dải trên (top ≤ 26%) hoặc dải dưới (top ≥ 76%) để không đè lên tiêu đề
const BUBBLES = [
  [10, 80, 64], [26, 14, 44], [22, 92, 40], [44, 8, 56], [58, 86, 72],
  [74, 16, 50], [90, 78, 60], [82, 92, 40], [6, 24, 38], [94, 26, 36], [38, 92, 34], [62, 4, 34],
];

function reviews(sec) {
  const d = sec.data;
  const avatars = d.items.map((r) => safeImg(r.avatar)).filter(Boolean).slice(0, BUBBLES.length);
  return `
<section class="reviews" id="${esc(sec.id)}">
  <div class="reviews__stage">
    ${avatars.map((a, i) => {
      const [x, y, s] = BUBBLES[i];
      return `<img class="bubble" src="${esc(a)}" alt="" loading="lazy" style="left:${x}%;top:${y}%;width:${s}px;height:${s}px;animation-delay:${(i * 0.7).toFixed(1)}s">`;
    }).join('')}
    <div class="reviews__head reveal">
      ${d.title ? `<h2 class="h2">${esc(d.title)}</h2>` : ''}
      ${d.rating ? stars(d.rating) : ''}
    </div>
  </div>
  ${d.items.some((r) => r.text) ? `
  <div class="reviews__track" tabindex="0" aria-label="Đánh giá của khách hàng">
    ${d.items.filter((r) => r.text).map((r) => `
      <figure class="review">
        ${stars(r.rating)}
        <blockquote>${esc(r.text)}</blockquote>
        <figcaption>
          ${safeImg(r.avatar) ? `<img src="${esc(safeImg(r.avatar))}" alt="" loading="lazy">` : `<span class="review__initial">${esc((r.name || '?').charAt(0))}</span>`}
          <span><strong>${esc(r.name)}</strong>${r.role ? `<small>${esc(r.role)}</small>` : ''}</span>
        </figcaption>
      </figure>`).join('')}
  </div>
  <div class="container reviews__nav">
    <button class="reviews__arrow" type="button" data-dir="-1" aria-label="Đánh giá trước">${icon('chevronLeft', 18)}</button>
    <button class="reviews__arrow" type="button" data-dir="1" aria-label="Đánh giá tiếp theo">${icon('chevronRight', 18)}</button>
  </div>` : ''}
</section>`;
}

function contact(sec, content) {
  const d = sec.data;
  const s = content.settings;
  const mail = s.email ? `mailto:${s.email}` : '';
  return `
<section class="contact" id="${esc(sec.id)}">
  <div class="container contact__inner reveal">
    ${d.eyebrow ? `<p class="eyebrow">${esc(d.eyebrow)}</p>` : ''}
    ${d.title ? `<h2 class="h2">${esc(d.title)}</h2>` : ''}
    ${d.text ? `<p class="contact__text">${nl2br(d.text)}</p>` : ''}
    ${mail && d.buttonText ? `<a class="btn btn--accent btn--lg" href="${esc(mail)}">${esc(d.buttonText)}</a>` : ''}
    <ul class="contact__info">
      ${s.email ? `<li>${icon('mail', 18)}<a href="${esc(mail)}">${esc(s.email)}</a></li>` : ''}
      ${s.phone ? `<li>${icon('phone', 18)}<a href="tel:${esc(s.phone.replace(/[^\d+]/g, ''))}">${esc(s.phone)}</a></li>` : ''}
      ${s.address ? `<li>${icon('pin', 18)}<span>${esc(s.address)}</span></li>` : ''}
    </ul>
    ${socialLinks(s)}
  </div>
</section>`;
}

function socialLinks(s) {
  const items = Object.entries(s.socials || {}).filter(([, u]) => u);
  if (!items.length) return '';
  return `<div class="socials">${items
    .map(([k, u]) => `<a href="${esc(safeUrl(u))}" target="_blank" rel="noopener" aria-label="${k}">${icon(k, 20)}</a>`)
    .join('')}</div>`;
}

const renderers = { hero, services, about, portfolio, reviews, contact };

/* ---------------- Trang hoàn chỉnh ---------------- */

function logo(s) {
  const img = safeImg(s.logoImage);
  return `<a class="logo" href="#top" aria-label="${esc(s.siteName)}">
    ${img ? `<img src="${esc(img)}" alt="${esc(s.siteName)}">` : `<span class="logo__mark">${icon('film', 22)}</span>`}
    ${s.logoText || s.logoSub ? `<span class="logo__text"><b>${esc(s.logoText)}</b><small>${esc(s.logoSub)}</small></span>` : ''}
  </a>`;
}

function renderPage(content, { preview = false } = {}) {
  const s = content.settings;
  const sections = content.sections.filter((sec) => sec.enabled);
  const nav = sections.filter((sec) => sec.navLabel);
  const font = s.headingFont;
  const fontsHref = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font).replace(/%20/g, '+')}:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap`;
  const cta = safeUrl(s.contactButtonLink);
  const og = safeImg(s.ogImage);
  const favicon = safeImg(s.favicon);
  const footer = String(s.footerText || '').replace('{year}', new Date().getFullYear());
  // Lựa chọn của người xem (nút sáng/tối) chỉ áp dụng ngoài trang xem trước của admin
  const allowChoice = s.themeToggle && !preview;
  const themeScript = `(function(){var d=document.documentElement,t=${JSON.stringify(s.theme)};${allowChoice ? "try{var c=localStorage.getItem('theme');if(c==='light'||c==='dark')t=c}catch(e){}" : ''}if(t==='auto')t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';d.dataset.theme=t})()`;

  return `<!doctype html>
<html lang="vi" data-theme="${s.theme === 'light' ? 'light' : 'dark'}" data-theme-mode="${s.theme}"${allowChoice ? ' data-theme-toggle' : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(s.metaTitle || s.siteName)}</title>
<meta name="description" content="${esc(s.metaDescription)}">
<meta property="og:title" content="${esc(s.metaTitle || s.siteName)}">
<meta property="og:description" content="${esc(s.metaDescription)}">
<meta property="og:type" content="website">
${og ? `<meta property="og:image" content="${esc(og)}">` : ''}
${favicon ? `<link rel="icon" href="${esc(favicon)}">` : ''}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${fontsHref}">
<link rel="stylesheet" href="/css/site.css?v=14">
<script>${themeScript};document.documentElement.classList.add('js');
// YouTube trả về ảnh xám 120x90 khi video không có ảnh HD -> chuyển sang ảnh thường
function thumbFix(img,err){var f=img.dataset.fallback;if(f&&(err||img.naturalWidth<=120)){img.removeAttribute('data-fallback');img.src=f;img.classList.add('lb')}}</script>
<meta name="theme-color" content="${s.theme === 'light' ? s.lightBackgroundColor : s.backgroundColor}">
<style>:root{--accent:${s.accentColor};--font-heading:'${esc(font)}',system-ui,sans-serif}:root,:root[data-theme='dark']{--bg:${s.backgroundColor}}:root[data-theme='light']{--bg:${s.lightBackgroundColor}}</style>
</head>
<body id="top"${preview ? ' class="is-preview"' : ''}>
<header class="header">
  <div class="container header__inner">
    ${logo(s)}
    <div class="header__tools">
      ${s.themeToggle ? `<button class="theme-toggle" type="button" aria-label="Đổi giao diện sáng/tối" title="Đổi giao diện sáng/tối"><span class="i-sun">${icon('sun', 18)}</span><span class="i-moon">${icon('moon', 18)}</span></button>` : ''}
      <button class="nav-toggle" type="button" aria-label="Mở menu" aria-expanded="false"><span></span><span></span></button>
    </div>
    <nav class="nav">
      ${nav.map((sec) => `<a href="#${esc(sec.id)}">${esc(sec.navLabel)}</a>`).join('')}
      ${s.contactButtonText ? `<a class="btn btn--outline" href="${esc(cta)}"${linkAttrs(cta)}>${esc(s.contactButtonText)}</a>` : ''}
    </nav>
  </div>
</header>
<main>
${sections.map((sec) => renderers[sec.type](sec, content)).join('\n')}
</main>
<footer class="footer">
  <div class="container footer__inner">
    ${logo(s)}
    <p>${esc(footer)}</p>
    ${socialLinks(s)}
  </div>
</footer>
<div class="lightbox" hidden>
  <div class="lightbox__backdrop" data-close></div>
  <div class="lightbox__box">
    <button class="lightbox__close" type="button" data-close aria-label="Đóng">×</button>
    <div class="lightbox__frame"></div>
  </div>
</div>
<script src="/js/site.js?v=14" defer></script>
</body>
</html>`;
}

module.exports = { renderPage, esc };
