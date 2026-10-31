// Render trang public phía server (tốt cho SEO, không bị nháy trang).
// Mọi nội dung đều được escape để khách nhập gì cũng không phá được trang.

const VideoUtils = require('../public/js/video-utils');
const { icon } = require('./icons');

// Trạng thái ảnh bìa HD của YouTube (script build kiểm tra trước): id -> 'hd' | 'hq'
let thumbStatus = () => undefined;

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
  return /^(https?:\/\/|\/?uploads\/)/i.test(url) ? url : '';
};

const nl2br = (s) => esc(s).replace(/\n/g, '<br>');
const isExternal = (u) => /^https?:/i.test(u);
const linkAttrs = (u) => (isExternal(u) ? ' target="_blank" rel="noopener"' : '');
const ratio = (a) => String(a).replace(':', ' / ');
// Link #id trỏ về khối trên trang chủ (trên trang dự án thì thêm ./ để quay về trang chủ)
const homeLink = (u, ctx) => (ctx.home && /^#./.test(u) ? ctx.home + u : u);

const SOCIAL_LABEL = { facebook: 'Facebook', youtube: 'YouTube', instagram: 'Instagram', tiktok: 'TikTok', behance: 'Behance', linkedin: 'LinkedIn', x: 'X (Twitter)', zalo: 'Zalo' };

const projectPath = (p) => `du-an/${encodeURIComponent(p.slug)}/`;
const isPublic = (p) => p.visible && p.url;

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

// Ảnh bìa: ảnh riêng -> ảnh HD của YouTube/Vimeo/Drive (tự xử lý khi YouTube không có bản HD)
function thumbImg(custom, info, { lazy = true, alt = '' } = {}) {
  const own = safeImg(custom);
  const yt = !own && info && info.thumbnailHd;
  const hd = yt ? thumbStatus(info.id) : null;
  let src = own || (info && info.thumbnail) || '';
  let extra = '';
  if (hd === 'hd') src = info.thumbnailHd;
  // Ảnh thường của YouTube có viền đen -> class lb phóng to để cắt viền
  else if (hd === 'hq') extra = ' class="lb"';
  // Chưa kiểm tra xong (server vừa khởi động): thử ảnh HD, lỗi thì tự chuyển
  else if (yt) {
    src = info.thumbnailHd;
    extra = ` data-fallback="${esc(info.thumbnail)}" onload="thumbFix(this)" onerror="thumbFix(this,1)"`;
  }
  return src ? `<img src="${esc(src)}" alt="${esc(alt)}"${lazy ? ' loading="lazy"' : ' fetchpriority="high"'}${extra}>` : '';
}

const playIcon = (size = 22) => `<span class="play-icon">${icon('triangle', size)}</span>`;

/* ---------------- Các khối trang chủ ---------------- */

function showreel(sec) {
  const d = sec.data;
  const reel = d.videoUrl ? videoAttrs(d.videoUrl) : null;
  const img = safeImg(d.image);
  // Video tải lên: chạy nền không tiếng làm hình động cho banner
  const bgVideo = reel && reel.info && reel.info.provider === 'file' ? reel.info.embed : '';
  return `
<section class="showreel" id="${esc(sec.id)}">
  <div class="container">
    <div class="showreel__stage reveal" data-player>
      ${bgVideo ? `<video class="showreel__bg" src="${esc(bgVideo)}"${img ? ` poster="${esc(img)}"` : ''} muted autoplay loop playsinline preload="metadata"></video>`
        : img ? `<img class="showreel__bg" src="${esc(img)}" alt="" fetchpriority="high">` : ''}
      <span class="showreel__shade"></span>
      <div class="showreel__text">
        ${d.title ? `<h1 class="showreel__title">${esc(d.title)}</h1>` : ''}
        ${d.subtitle ? `<p class="showreel__sub">${esc(d.subtitle)}</p>` : ''}
      </div>
      ${reel && reel.attrs ? `<button class="showreel__play js-play" type="button"${reel.attrs} aria-label="Xem showreel">${icon('triangle', 30)}</button>` : ''}
      <div class="player__slot"></div>
    </div>
  </div>
</section>`;
}

function profile(sec, content, ctx) {
  const d = sec.data;
  const s = content.settings;
  const img = safeImg(d.image);
  const btn = homeLink(safeUrl(d.buttonLink), ctx);
  const tel = s.phone ? `tel:${s.phone.replace(/[^\d+]/g, '')}` : '';
  const stats = d.stats.filter((st) => st.value || st.label);
  return `
<section class="profile" id="${esc(sec.id)}">
  <div class="container">
    <div class="profile__card reveal${img ? '' : ' profile__card--noimg'}${stats.length ? '' : ' profile__card--nostats'}">
      ${img ? `<div class="profile__media"><img src="${esc(img)}" alt="${esc(s.siteName)}" loading="lazy"></div>` : ''}
      <div class="profile__body">
        ${d.title ? `<h2 class="profile__title">${esc(d.title)}</h2>` : ''}
        ${d.text ? `<p class="profile__text">${nl2br(d.text)}</p>` : ''}
        ${d.showContact && (s.phone || s.email) ? `
        <ul class="profile__contact">
          ${s.phone ? `<li><b>SĐT:</b> <a href="${esc(tel)}">${esc(s.phone)}</a></li>` : ''}
          ${s.email ? `<li><b>Email:</b> <a href="mailto:${esc(s.email)}">${esc(s.email)}</a></li>` : ''}
        </ul>` : ''}
        ${d.buttonText ? `<a class="btn btn--accent" href="${esc(btn)}"${linkAttrs(btn)}>${esc(d.buttonText)}</a>` : ''}
        ${d.showSocials ? socialLinks(s, 'socials--sm') : ''}
      </div>
      ${stats.length ? `
      <ul class="profile__stats">
        ${stats.map((st) => `<li><strong>${esc(st.value)}</strong><span>${esc(st.label)}</span></li>`).join('')}
      </ul>` : ''}
    </div>
  </div>
</section>`;
}

function projectCard(p, aspect) {
  const { info } = videoAttrs(p.url);
  const sub = p.description || p.role;
  return `
    <article class="card reveal" data-cat="${esc(p.category)}">
      <a class="card__link" href="${esc(projectPath(p))}" data-project="${esc(p.id)}">
        <span class="card__media" style="aspect-ratio:${ratio(aspect)}">
          ${thumbImg(p.thumbnail, info, { alt: p.title }) || `<span class="card__ph">${icon('film', 36)}</span>`}
          <span class="card__hover">${playIcon(20)}</span>
        </span>
        <span class="card__meta">
          <strong>${esc(p.title)}</strong>
          ${sub ? `<small>${esc(sub)}</small>` : ''}
        </span>
      </a>
    </article>`;
}

function portfolio(sec, content) {
  const d = sec.data;
  let list = content.videos.filter(isPublic);
  if (d.category) list = list.filter((v) => v.category.toLowerCase() === d.category.toLowerCase());
  if (d.limit) list = list.slice(0, d.limit);
  // Chỉ hiện danh mục đang có dự án, theo thứ tự trong admin
  const cats = content.categories.filter((c) => list.some((v) => v.category === c));
  return `
<section class="portfolio" id="${esc(sec.id)}">
  <div class="container">
    ${d.showFilter && cats.length > 1 ? `
    <div class="filters reveal" role="group" aria-label="Lọc theo danh mục">
      <button class="filter is-active" type="button" data-filter="" aria-pressed="true">Tất cả</button>
      ${cats.map((c) => `<button class="filter" type="button" data-filter="${esc(c)}" aria-pressed="false">${esc(c)}</button>`).join('')}
    </div>` : ''}
    ${d.title ? `<h2 class="h2 reveal">${esc(d.title)}</h2>` : ''}
    <div class="grid" style="--cols:${d.columns}">
      ${list.length ? list.map((v) => projectCard(v, d.aspect)).join('') : '<p class="empty">Chưa có dự án nào.</p>'}
    </div>
  </div>
</section>`;
}

function contact(sec, content, ctx) {
  const d = sec.data;
  const s = content.settings;
  const mail = s.email ? `mailto:${s.email}` : '';
  const info = [
    s.address && ['pin', 'Địa chỉ', `<span>${esc(s.address)}</span>`],
    s.email && ['mail', 'Email', `<a href="${esc(mail)}">${esc(s.email)}</a>`],
    s.phone && ['phone', 'Điện thoại', `<a href="tel:${esc(s.phone.replace(/[^\d+]/g, ''))}">${esc(s.phone)}</a>`],
  ].filter(Boolean);
  const btn = esc(d.buttonText || 'Gửi tin nhắn');
  return `
<section class="contact" id="${esc(sec.id)}">
  <div class="container">
    <div class="contact__card reveal">
      <div class="contact__main">
        ${d.title ? `<h2 class="h2">${esc(d.title)}</h2>` : ''}
        ${d.text ? `<p class="contact__text">${nl2br(d.text)}</p>` : ''}
        ${d.showForm ? `
        <form class="contact-form" data-email="${esc(s.email)}">
          <div class="contact-form__row">
            <input name="name" placeholder="Họ tên" aria-label="Họ tên" autocomplete="name" required maxlength="120">
            <input name="email" type="email" placeholder="Email" aria-label="Email" autocomplete="email" required maxlength="200">
          </div>
          <textarea name="message" placeholder="Lời nhắn" aria-label="Lời nhắn" rows="4" required maxlength="5000"></textarea>
          <input class="contact-form__hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
          <button class="btn btn--accent btn--block" type="submit">${btn}</button>
          <p class="contact-form__status" role="status"></p>
        </form>` : mail ? `<a class="btn btn--accent btn--lg" href="${esc(mail)}">${btn}</a>` : ''}
      </div>
      ${info.length || Object.values(s.socials).some(Boolean) ? `
      <div class="contact__side">
        <ul class="contact__info">
          ${info.map(([ic, label, value]) => `<li>${icon(ic, 18)}<div><b>${label}</b>${value}</div></li>`).join('')}
        </ul>
        ${socialLinks(s, 'socials--sm')}
      </div>` : ''}
    </div>
  </div>
</section>`;
}

function socialLinks(s, cls = '') {
  const items = Object.entries(s.socials || {}).filter(([, u]) => u);
  if (!items.length) return '';
  return `<div class="socials ${cls}">${items
    .map(([k, u]) => `<a href="${esc(safeUrl(u))}" target="_blank" rel="noopener" aria-label="${SOCIAL_LABEL[k] || k}" title="${SOCIAL_LABEL[k] || k}">${icon(k, 18)}</a>`)
    .join('')}</div>`;
}

/* ---------------- Khối Behind the scenes ---------------- */

function compare(d) {
  const before = safeImg(d.beforeImage);
  const after = safeImg(d.afterImage);
  if (!before || !after) return '';
  return `
      <figure class="bts__block">
        <h3 class="label">So sánh màu sắc <small>(Before / After color grading)</small></h3>
        <div class="compare" style="--pos:50%">
          <img src="${esc(after)}" alt="Sau khi chỉnh màu" loading="lazy">
          <div class="compare__before"><img src="${esc(before)}" alt="Trước khi chỉnh màu" loading="lazy"></div>
          <span class="compare__line"><span>${icon('chevronLeft', 14)}${icon('chevronRight', 14)}</span></span>
          <input class="compare__range" type="range" min="0" max="100" value="50" step="0.5" aria-label="Kéo để so sánh trước và sau khi chỉnh màu">
          ${d.beforeLabel ? `<span class="compare__tag compare__tag--l">${esc(d.beforeLabel)}</span>` : ''}
          ${d.afterLabel ? `<span class="compare__tag compare__tag--r">${esc(d.afterLabel)}</span>` : ''}
        </div>
      </figure>`;
}

function formatsBlock(d) {
  const items = d.formats.filter((f) => safeImg(f.image));
  if (!items.length) return '';
  return `
    <div class="bts__row">
      <h3 class="label">Multi-formats <small>(ngang &amp; dọc)</small></h3>
      <div class="formats">
        ${items.map((f) => {
          const [w, h] = f.aspect.split(':').map(Number);
          const src = safeImg(f.image);
          return `<button class="format js-image" type="button" data-src="${esc(src)}" style="flex-grow:${(w / h).toFixed(3)};aspect-ratio:${w} / ${h}" aria-label="Phóng to ${esc(f.label || 'ảnh')}">
            <img src="${esc(src)}" alt="${esc(f.label)}" loading="lazy">
            ${f.label ? `<span class="format__label">${esc(f.label)}</span>` : ''}
          </button>`;
        }).join('')}
      </div>
    </div>`;
}

function galleryBlock(d) {
  const items = d.bts.filter((b) => safeImg(b.image));
  if (!items.length) return '';
  // Gom các ảnh liền nhau cùng nhóm: mỗi nhóm có nhãn riêng, cùng nằm trên một hàng
  const groups = [];
  for (const it of items) {
    const name = it.group || 'Cảnh quay on-set & BTS';
    const last = groups[groups.length - 1];
    if (last && last.name === name) last.items.push(it);
    else groups.push({ name, items: [it] });
  }
  return `
    <div class="gallery">
      ${groups.map((g) => `
      <div class="gallery__group" style="--n:${g.items.length}">
        <h3 class="label">${esc(g.name)}</h3>
        <div class="gallery__items">
          ${g.items.map((it) => {
            const src = safeImg(it.image);
            return `<figure class="shot">
              <button class="shot__btn js-image" type="button" data-src="${esc(src)}" aria-label="${esc(it.caption || 'Xem ảnh')}"><img src="${esc(src)}" alt="${esc(it.caption)}" loading="lazy"></button>
              ${it.caption ? `<figcaption>${esc(it.caption)}</figcaption>` : ''}
            </figure>`;
          }).join('')}
        </div>
      </div>`).join('')}
    </div>`;
}

function bts(sec) {
  const d = sec.data;
  const timeline = safeImg(d.timelineImage);
  const cmp = compare(d);
  const top = timeline || cmp ? `
    <div class="bts__top">
      ${timeline ? `
      <figure class="bts__block">
        <h3 class="label">Timeline workflow</h3>
        <button class="zoom js-image" type="button" data-src="${esc(timeline)}" aria-label="Phóng to timeline"><img src="${esc(timeline)}" alt="Timeline dựng phim" loading="lazy"></button>
      </figure>` : ''}
      ${cmp}
    </div>` : '';
  const body = top + formatsBlock(d) + galleryBlock(d);
  if (!body) return '';
  return `
<section class="bts" id="${esc(sec.id)}">
  <div class="container reveal">
    ${d.title || d.subtitle ? `<h2 class="h2">${esc(d.title)}${d.subtitle ? ` <span>${d.title ? '/ ' : ''}${esc(d.subtitle)}</span>` : ''}</h2>` : ''}
    ${body}
  </div>
</section>`;
}

const renderers = { showreel, profile, portfolio, bts, contact };

/* ---------------- Trang dự án: video + thông tin dự án ---------------- */

function projectMain(p, content, ctx) {
  const { attrs, info } = videoAttrs(p.url);
  const vertical = info && info.vertical;
  const facts = [
    ['Khách hàng', p.client],
    ['Vai trò', p.role],
    ['Phần mềm', p.software],
    ['Thiết bị', p.equipment],
    ['Năm', p.year],
  ].filter(([, v]) => v);
  const list = content.videos.filter(isPublic);
  const i = list.findIndex((v) => v.id === p.id);
  const next = list.length > 1 ? list[(i + 1) % list.length] : null;

  return `
<article class="project">
  <div class="container">
    <a class="back" href="${ctx.home}#${esc(ctx.portfolioId)}">${icon('arrowLeft', 16)} Tất cả dự án</a>
    <h1 class="project__title">${esc(p.title)}${p.category ? ` <em>(${esc(p.category)})</em>` : ''}</h1>
    <div class="project__top${vertical ? ' is-vertical' : ''}${facts.length || p.summary ? '' : ' project__top--full'}">
      <div class="player reveal" data-player style="aspect-ratio:${vertical ? '9 / 16' : '16 / 9'}">
        ${thumbImg(p.thumbnail, info, { lazy: false, alt: p.title })}
        <span class="player__shade"></span>
        ${attrs ? `<button class="player__play js-play" type="button"${attrs} aria-label="Phát video ${esc(p.title)}">${icon('triangle', 28)}</button>` : ''}
        <div class="player__slot"></div>
      </div>
      ${facts.length || p.summary ? `
      <aside class="project__info reveal">
        <h2 class="label">Thông tin dự án</h2>
        ${facts.length ? `<dl>${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
        ${p.summary ? `<p>${nl2br(p.summary)}</p>` : ''}
      </aside>` : ''}
    </div>
  </div>
</article>
${next ? `
<nav class="next" aria-label="Dự án tiếp theo">
  <a class="container next__link" href="${esc(projectPath(next))}">
    <span class="next__label">Dự án tiếp theo</span>
    <span class="next__title">${esc(next.title)} ${icon('arrowRight', 28)}</span>
  </a>
</nav>` : ''}`;
}

/* ---------------- Khung trang ---------------- */

function logo(s, home) {
  const img = safeImg(s.logoImage);
  return `<a class="logo" href="${home}#top" aria-label="${esc(s.siteName)}">
    ${img ? `<img src="${esc(img)}" alt="${esc(s.siteName)}">` : ''}
    ${s.logoText || s.logoSub ? `<span class="logo__text"><b>${esc(s.logoText)}</b>${s.logoText && s.logoSub ? '<i></i>' : ''}<small>${esc(s.logoSub)}</small></span>` : ''}
  </a>`;
}

// page: 'home' | 'project'
function layout(content, { title, description, image, body, page = 'home', slug = '', activeNav = '', preview = false, base = '', thumbs, version = '1', live = false, contentVersion = '' }) {
  const s = content.settings;
  const home = page === 'home' ? '' : './';
  const nav = content.sections.filter((sec) => sec.enabled && sec.navLabel);
  const font = s.headingFont;
  const fontsHref = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font).replace(/%20/g, '+')}:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap`;
  const cta = homeLink(safeUrl(s.contactButtonLink), { home });
  const og = safeImg(image) || safeImg(s.ogImage);
  const favicon = safeImg(s.favicon);
  const footer = String(s.footerText || '').replace('{year}', new Date().getFullYear());
  // Lựa chọn của người xem (nút sáng/tối) chỉ áp dụng ngoài trang xem trước của admin
  const allowChoice = s.themeToggle && !preview;
  const themeScript = `(function(){var d=document.documentElement,t=${JSON.stringify(s.theme)};${allowChoice ? "try{var c=localStorage.getItem('theme');if(c==='light'||c==='dark')t=c}catch(e){}" : ''}if(t==='auto')t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';d.dataset.theme=t})()`;

  return `<!doctype html>
<html lang="vi" data-theme="${s.theme === 'light' ? 'light' : 'dark'}" data-theme-mode="${s.theme}" data-page="${page}"${slug ? ` data-slug="${esc(slug)}"` : ''}${allowChoice ? ' data-theme-toggle' : ''}${live ? ` data-content-version="${esc(contentVersion)}" data-asset-version="${esc(version)}"` : ''}>
<head>
<meta charset="utf-8">
${base ? `<base href="${esc(base)}">` : ''}
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="${page === 'home' ? 'website' : 'article'}">
${og ? `<meta property="og:image" content="${esc(og)}">` : ''}
${favicon ? `<link rel="icon" href="${esc(favicon)}">` : ''}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${fontsHref}">
<link rel="stylesheet" href="css/site.css?v=${esc(version)}">
<script>${themeScript};document.documentElement.classList.add('js');
// YouTube trả về ảnh xám 120x90 khi video không có ảnh HD -> chuyển sang ảnh thường
function thumbFix(img,err){var f=img.dataset.fallback;if(f&&(err||img.naturalWidth<=120)){img.removeAttribute('data-fallback');img.src=f;img.classList.add('lb')}}</script>
<meta name="theme-color" content="${s.theme === 'light' ? s.lightBackgroundColor : s.backgroundColor}">
<style>:root{--accent:${s.accentColor};--font-heading:'${esc(font)}',system-ui,sans-serif}:root,:root[data-theme='dark']{--bg:${s.backgroundColor}}:root[data-theme='light']{--bg:${s.lightBackgroundColor}}</style>
</head>
<body id="top"${preview ? ' class="is-preview"' : ''}>
<header class="header">
  <div class="container header__inner">
    ${logo(s, home)}
    <div class="header__tools">
      ${s.themeToggle ? `<button class="theme-toggle" type="button" aria-label="Đổi giao diện sáng/tối" title="Đổi giao diện sáng/tối"><span class="i-sun">${icon('sun', 18)}</span><span class="i-moon">${icon('moon', 18)}</span></button>` : ''}
      <button class="nav-toggle" type="button" aria-label="Mở menu" aria-expanded="false"><span></span><span></span></button>
    </div>
    <nav class="nav">
      ${nav.map((sec) => `<a href="${home}#${esc(sec.id)}"${sec.id === activeNav ? ' class="is-active"' : ''}>${esc(sec.navLabel)}</a>`).join('')}
      ${s.contactButtonText ? `<a class="btn btn--outline" href="${esc(cta)}"${linkAttrs(cta)}>${esc(s.contactButtonText)}</a>` : ''}
    </nav>
  </div>
</header>
<main>
${body}
</main>
<footer class="footer">
  <div class="container footer__inner">
    ${logo(s, home)}
    <p>${esc(footer)}</p>
    ${socialLinks(s, 'socials--sm')}
  </div>
</footer>
<div class="lightbox" hidden>
  <div class="lightbox__backdrop" data-close></div>
  <div class="lightbox__box">
    <button class="lightbox__close" type="button" data-close aria-label="Đóng">×</button>
    <div class="lightbox__frame"></div>
  </div>
</div>
<script src="js/config.js?v=${esc(version)}" defer></script>
<script src="js/site.js?v=${esc(version)}" defer></script>
</body>
</html>`;
}

// live: trang thật (tải nội dung mới nhất từ Supabase khi mở) | contentVersion: thời điểm lưu của nội dung đang render
function renderPage(content, opts = {}) {
  thumbStatus = opts.thumbs || (() => undefined);
  const s = content.settings;
  const ctx = { home: '' };
  const body = content.sections.filter((sec) => sec.enabled).map((sec) => renderers[sec.type](sec, content, ctx)).join('\n');
  return layout(content, { ...opts, title: s.metaTitle || s.siteName, description: s.metaDescription, body, page: 'home' });
}

// Trang dự án (video + thông tin). key: slug hoặc id. Trả về null nếu không có dự án (hoặc dự án đang ẩn)
function renderProjectPage(content, key, opts = {}) {
  thumbStatus = opts.thumbs || (() => undefined);
  const p = content.videos.find((v) => (v.slug === key || v.id === key) && (opts.preview || isPublic(v)));
  if (!p) return null;
  const s = content.settings;
  const portfolioSec = content.sections.find((sec) => sec.enabled && sec.type === 'portfolio');
  const ctx = { home: './', portfolioId: portfolioSec ? portfolioSec.id : 'top' };
  const { info } = videoAttrs(p.url);
  const desc = p.summary || [p.client, p.role].filter(Boolean).join(' · ') || s.metaDescription;
  return layout(content, {
    ...opts,
    title: `${p.title} — ${s.siteName}`,
    description: desc.replace(/\s+/g, ' ').slice(0, 300),
    image: safeImg(p.thumbnail) || (info && (info.thumbnailHd || info.thumbnail)) || '',
    body: projectMain(p, content, ctx),
    page: 'project',
    slug: p.slug,
    activeNav: portfolioSec && portfolioSec.navLabel ? portfolioSec.id : '',
  });
}

module.exports = { renderPage, renderProjectPage, projectPath, isPublic, esc };
