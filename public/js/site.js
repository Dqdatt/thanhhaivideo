(function () {
  const root = document.documentElement;
  root.classList.add('js');

  /* ================= Sự kiện dùng chung (gắn 1 lần, ủy quyền qua document) ================= */

  // Header: viền khi cuộn + đánh dấu mục menu đang xem (trang chủ)
  const onScroll = () => {
    const header = document.querySelector('.header');
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 8);
    if (root.dataset.page !== 'home') return;
    const links = [...document.querySelectorAll('.nav > a[href^="#"]')];
    let current = null;
    for (const a of links) {
      const sec = document.getElementById(a.getAttribute('href').slice(1));
      if (sec && sec.getBoundingClientRect().top < window.innerHeight * 0.35) current = a;
    }
    links.forEach((a) => a.classList.toggle('is-active', a === current));
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  const setNavOpen = (open) => {
    const nav = document.querySelector('.nav');
    const toggle = document.querySelector('.nav-toggle');
    if (!nav || !toggle) return;
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };

  // Chế độ "Tự động": đổi theo thiết bị nếu người xem chưa tự chọn
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
      if (root.dataset.themeMode !== 'auto') return;
      let chosen = null;
      try { chosen = root.hasAttribute('data-theme-toggle') && localStorage.getItem('theme'); } catch (err) { /* bỏ qua */ }
      if (!chosen) root.dataset.theme = e.matches ? 'light' : 'dark';
    });
  }

  // Tạo khung phát video từ data-embed / data-provider
  function mediaEl({ embed, provider }) {
    if (provider === 'file') {
      const v = document.createElement('video');
      v.src = embed;
      v.controls = true;
      v.autoplay = true;
      v.playsInline = true;
      return v;
    }
    const f = document.createElement('iframe');
    f.src = embed;
    f.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media';
    f.allowFullscreen = true;
    f.title = 'Video';
    return f;
  }

  // Lightbox xem video / ảnh
  let lastFocus = null;
  function openBox(content, mode) {
    const box = document.querySelector('.lightbox');
    if (!box) return;
    const frame = box.querySelector('.lightbox__frame');
    frame.replaceChildren(content);
    const inner = box.querySelector('.lightbox__box');
    inner.classList.toggle('is-vertical', mode === 'vertical');
    inner.classList.toggle('is-image', mode === 'image');
    box.hidden = false;
    document.body.style.overflow = 'hidden';
    box.querySelector('.lightbox__close').focus();
  }
  function openVideo(el) {
    const { embed, link, vertical } = el.dataset;
    if (!embed) {
      if (link) window.open(link, '_blank', 'noopener');
      return;
    }
    lastFocus = el;
    openBox(mediaEl(el.dataset), vertical === '1' ? 'vertical' : 'video');
  }
  function openImage(el) {
    if (!el.dataset.src) return;
    lastFocus = el;
    const img = document.createElement('img');
    img.src = el.dataset.src;
    img.alt = el.getAttribute('aria-label') || '';
    openBox(img, 'image');
  }
  function closeBox() {
    const box = document.querySelector('.lightbox');
    if (!box || box.hidden) return;
    box.hidden = true;
    box.querySelector('.lightbox__frame').textContent = '';
    document.body.style.overflow = '';
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }

  // Phát ngay trong khung (showreel, video chính của dự án)
  function playInline(btn) {
    const player = btn.closest('[data-player]');
    const slot = player && player.querySelector('.player__slot');
    const { embed, vertical } = btn.dataset;
    // Video dọc trong khung ngang (hoặc link không nhúng được): mở popup
    if (!slot || !embed || (vertical === '1' && player.classList.contains('showreel__stage'))) return openVideo(btn);
    slot.replaceChildren(mediaEl(btn.dataset));
    player.classList.add('is-playing');
    const bg = player.querySelector('video.showreel__bg');
    if (bg) bg.pause();
  }

  document.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('.nav-toggle')) {
      const nav = document.querySelector('.nav');
      return setNavOpen(!(nav && nav.classList.contains('is-open')));
    }
    if (t.closest('.nav a')) setNavOpen(false);

    // Đổi theme sáng / tối
    const themeBtn = t.closest('.theme-toggle');
    if (themeBtn) {
      const next = root.dataset.theme === 'light' ? 'dark' : 'light';
      root.classList.add('theme-switching');
      root.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (err) { /* bỏ qua */ }
      clearTimeout(themeBtn._t);
      themeBtn._t = setTimeout(() => root.classList.remove('theme-switching'), 400);
      return;
    }

    // Lọc dự án theo danh mục
    const filter = t.closest('.filter');
    if (filter) {
      const sec = filter.closest('.portfolio');
      const cat = filter.dataset.filter;
      sec.querySelectorAll('.filter').forEach((b) => {
        b.classList.toggle('is-active', b === filter);
        b.setAttribute('aria-pressed', String(b === filter));
      });
      let i = 0;
      sec.querySelectorAll('.card').forEach((card) => {
        const show = !cat || card.dataset.cat === cat;
        card.classList.toggle('is-hidden', !show);
        card.classList.remove('is-filter-in');
        if (!show) return;
        card.classList.add('is-in');
        void card.offsetWidth; // chạy lại animation
        card.style.animationDelay = `${i++ * 50}ms`;
        card.classList.add('is-filter-in');
      });
      return;
    }

    const play = t.closest('.js-play');
    if (play) return playInline(play);
    const video = t.closest('.js-video');
    if (video) return openVideo(video);
    const image = t.closest('.js-image');
    if (image) return openImage(image);
    if (t.closest('[data-close]')) closeBox();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeBox();
  });

  // Thanh so sánh màu trước / sau
  document.addEventListener('input', (e) => {
    const range = e.target.closest && e.target.closest('.compare__range');
    if (range) range.closest('.compare').style.setProperty('--pos', `${range.value}%`);
  });

  /* ================= Form liên hệ ================= */
  // Gửi vào bảng contact_messages trên Supabase (xem trong /admin → Tin nhắn).
  // Không gửi được (mất mạng, chưa thiết lập) thì mở ứng dụng email với nội dung đã điền.

  document.addEventListener('submit', async (e) => {
    const form = e.target.closest('.contact-form');
    if (!form) return;
    e.preventDefault();
    const status = form.querySelector('.contact-form__status');
    const btn = form.querySelector('button[type="submit"]');
    const val = (n) => (form.elements[n] ? form.elements[n].value.trim() : '');
    const data = { name: val('name'), email: val('email'), message: val('message'), project: val('project') };
    const say = (msg, kind) => {
      status.textContent = msg;
      status.className = `contact-form__status${kind ? ` is-${kind}` : ''}`;
    };
    if (!data.name || !data.message || !/^\S+@\S+\.\S+$/.test(data.email)) return say('Vui lòng nhập họ tên, email hợp lệ và lời nhắn.', 'err');
    if (val('website')) return say('Đã gửi. Cảm ơn bạn!', 'ok'); // bot điền ô ẩn
    if (document.body.classList.contains('is-preview')) return say('Đây là bản xem trước, form chưa gửi đi.', '');

    btn.disabled = true;
    say('Đang gửi…');
    const cfg = window.PORTFOLIO_CONFIG;
    try {
      if (!cfg || !cfg.supabaseUrl) throw new Error('no-config');
      const res = await fetch(`${cfg.supabaseUrl}/rest/v1/contact_messages`, {
        method: 'POST',
        headers: { apikey: cfg.supabaseKey, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ ...data, project: data.project || null }),
      });
      if (!res.ok) throw new Error(String(res.status));
      form.reset();
      say('Đã gửi tin nhắn. Mình sẽ phản hồi sớm nhất!', 'ok');
    } catch (err) {
      const to = form.dataset.email;
      if (to) {
        const subject = `Liên hệ từ website${data.project ? ` — ${data.project}` : ''}`;
        const body = `${data.message}\n\n— ${data.name} (${data.email})`;
        window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        say('Đang mở ứng dụng email để gửi tin nhắn…', '');
      } else {
        say('Chưa gửi được, vui lòng thử lại sau.', 'err');
      }
    } finally {
      btn.disabled = false;
    }
  });

  /* ================= Khởi tạo phần tử trên trang (chạy lại sau khi thay nội dung) ================= */

  let io = null;
  function init({ instant = false } = {}) {
    onScroll();

    // Hiệu ứng xuất hiện khi cuộn
    if (io) io.disconnect();
    const items = document.querySelectorAll('.reveal');
    if (instant) {
      // Thay nội dung ngay sau khi tải: phần đang hiện trên màn hình không chạy lại hiệu ứng
      items.forEach((el) => { if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('is-in'); });
    }
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add('is-in');
            io.unobserve(en.target);
          }
        });
      }, { rootMargin: '0px 0px -8% 0px' });
      items.forEach((el) => { if (!el.classList.contains('is-in')) io.observe(el); });
    } else {
      items.forEach((el) => el.classList.add('is-in'));
    }
  }

  init();

  /* ================= Nội dung mới nhất từ Supabase ================= */
  // Trang HTML được build sẵn (tốt cho SEO). Khi mở trang, nếu trên Supabase có bản mới hơn
  // (khách vừa bấm Lưu trong /admin) thì render lại ngay bằng nội dung mới.

  const loadScript = (src) => new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });

  function applyTheme(mode, allowChoice) {
    let t = mode;
    if (allowChoice) {
      try { const c = localStorage.getItem('theme'); if (c === 'light' || c === 'dark') t = c; } catch (e) { /* bỏ qua */ }
    }
    if (t === 'auto') t = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    root.dataset.theme = t;
  }

  function swapPage(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const next = doc.documentElement;
    // Thuộc tính của <html>: chế độ theme, nút đổi theme, phiên bản nội dung
    ['data-theme-mode', 'data-content-version'].forEach((a) => root.setAttribute(a, next.getAttribute(a) || ''));
    root.toggleAttribute('data-theme-toggle', next.hasAttribute('data-theme-toggle'));
    applyTheme(root.dataset.themeMode, root.hasAttribute('data-theme-toggle'));
    // <head>: tiêu đề, mô tả, màu, font, favicon
    document.title = doc.title;
    const sync = (sel, attr) => {
      const a = document.head.querySelector(sel);
      const b = doc.head.querySelector(sel);
      if (a && b) a.setAttribute(attr, b.getAttribute(attr));
      else if (b) document.head.appendChild(b.cloneNode(true));
      else if (a) a.remove();
    };
    sync('meta[name="description"]', 'content');
    sync('meta[name="theme-color"]', 'content');
    sync('link[rel="icon"]', 'href');
    sync('link[href*="fonts.googleapis.com/css2"]', 'href');
    const style = [...document.head.querySelectorAll('style')].find((s) => s.textContent.includes('--accent'));
    const nextStyle = [...doc.head.querySelectorAll('style')].find((s) => s.textContent.includes('--accent'));
    if (style && nextStyle) style.textContent = nextStyle.textContent;
    // <body>: thay toàn bộ nội dung (bỏ script vì đã chạy rồi)
    doc.body.querySelectorAll('script').forEach((s) => s.remove());
    document.body.innerHTML = doc.body.innerHTML;
    init({ instant: true });
  }

  async function refreshFromSupabase() {
    const cfg = window.PORTFOLIO_CONFIG;
    if (!cfg || !cfg.supabaseUrl || !cfg.supabaseKey || !root.hasAttribute('data-content-version')) return;
    try {
      const res = await fetch(`${cfg.supabaseUrl}/rest/v1/site_content?id=eq.1&select=content,updated_at`, {
        headers: { apikey: cfg.supabaseKey },
        cache: 'no-store',
      });
      if (!res.ok) return;
      const row = (await res.json())[0];
      if (!row || row.updated_at === root.dataset.contentVersion) return; // trang đã là bản mới nhất
      const v = root.dataset.assetVersion || '1';
      if (!window.Portfolio) await loadScript(`js/portfolio.bundle.js?v=${encodeURIComponent(v)}`);
      const P = window.Portfolio;
      const content = P.normalizeContent(row.content);
      const baseEl = document.querySelector('base');
      const opts = { live: true, contentVersion: row.updated_at, version: v, base: baseEl ? baseEl.getAttribute('href') : '' };
      if (root.dataset.page === 'project') {
        const html = P.renderProjectPage(content, root.dataset.slug, opts);
        // Dự án vừa bị ẩn / đổi đường dẫn: về trang chủ
        if (!html) return window.location.replace(baseEl ? baseEl.href : './');
        swapPage(html);
      } else {
        swapPage(P.renderPage(content, opts));
      }
    } catch (e) {
      // Lỗi mạng: giữ nguyên bản build sẵn
    }
  }

  refreshFromSupabase();
})();
