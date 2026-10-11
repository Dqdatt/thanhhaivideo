(function () {
  const root = document.documentElement;
  root.classList.add('js');

  /* ================= Sự kiện dùng chung (gắn 1 lần, ủy quyền qua document) ================= */

  // Header: viền khi cuộn
  const onScroll = () => {
    const header = document.querySelector('.header');
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 8);
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

  // Lightbox xem video
  let lastFocus = null;
  function openVideo(el) {
    const box = document.querySelector('.lightbox');
    const { embed, provider, link, vertical } = el.dataset;
    if (!embed) {
      if (link) window.open(link, '_blank', 'noopener');
      return;
    }
    if (!box) return;
    const frame = box.querySelector('.lightbox__frame');
    lastFocus = el;
    frame.textContent = '';
    if (provider === 'file') {
      const v = document.createElement('video');
      v.src = embed;
      v.controls = true;
      v.autoplay = true;
      v.playsInline = true;
      frame.appendChild(v);
    } else {
      const f = document.createElement('iframe');
      f.src = embed;
      f.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media';
      f.allowFullscreen = true;
      f.title = 'Video';
      frame.appendChild(f);
    }
    box.querySelector('.lightbox__box').classList.toggle('is-vertical', vertical === '1');
    box.hidden = false;
    document.body.style.overflow = 'hidden';
    box.querySelector('.lightbox__close').focus();
  }
  function closeVideo() {
    const box = document.querySelector('.lightbox');
    if (!box || box.hidden) return;
    box.hidden = true;
    box.querySelector('.lightbox__frame').textContent = '';
    document.body.style.overflow = '';
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
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

    // Lọc video theo danh mục
    const filter = t.closest('.filter');
    if (filter) {
      const sec = filter.closest('.portfolio');
      const cat = filter.dataset.filter;
      sec.querySelectorAll('.filter').forEach((b) => b.classList.toggle('is-active', b === filter));
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

    // Nút ‹ › của dải đánh giá
    const arrow = t.closest('.reviews__arrow');
    if (arrow) {
      const track = arrow.closest('.reviews').querySelector('.reviews__track');
      const card = track.querySelector('.review');
      const step = card ? card.getBoundingClientRect().width + 16 : track.clientWidth * 0.8;
      track.scrollBy({ left: step * Number(arrow.dataset.dir), behavior: 'smooth' });
      return;
    }

    const trigger = t.closest('.js-video');
    if (trigger) return openVideo(trigger);
    if (t.closest('[data-close]')) closeVideo();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeVideo();
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

    // Trạng thái nút ‹ › của dải đánh giá
    document.querySelectorAll('.reviews').forEach((sec) => {
      const track = sec.querySelector('.reviews__track');
      const nav = sec.querySelector('.reviews__nav');
      if (!track || !nav) return;
      const [prev, next] = nav.querySelectorAll('.reviews__arrow');
      const update = () => {
        const max = track.scrollWidth - track.clientWidth;
        nav.hidden = max <= 2;
        prev.disabled = track.scrollLeft <= 2;
        next.disabled = track.scrollLeft >= max - 2;
      };
      track.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update);
      update();
    });
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
      swapPage(P.renderPage(P.normalizeContent(row.content), { live: true, contentVersion: row.updated_at, version: v }));
    } catch (e) {
      // Lỗi mạng: giữ nguyên bản build sẵn
    }
  }

  refreshFromSupabase();
})();
