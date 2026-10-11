(function () {
  document.documentElement.classList.add('js');

  /* Header: viền khi cuộn + menu mobile */
  const header = document.querySelector('.header');
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.nav');
  const onScroll = () => header && header.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (toggle && nav) {
    const setOpen = (open) => {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    };
    toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
    nav.addEventListener('click', (e) => e.target.closest('a') && setOpen(false));
  }

  /* Đổi theme sáng / tối */
  const root = document.documentElement;
  const themeBtn = document.querySelector('.theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const next = root.dataset.theme === 'light' ? 'dark' : 'light';
      root.classList.add('theme-switching');
      root.dataset.theme = next;
      clearTimeout(themeBtn._t);
      themeBtn._t = setTimeout(() => root.classList.remove('theme-switching'), 400);
      try { localStorage.setItem('theme', next); } catch (e) { /* bỏ qua */ }
    });
  }
  // Chế độ "Tự động": đổi theo thiết bị nếu người xem chưa tự chọn
  if (root.dataset.themeMode === 'auto' && window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
      let chosen = null;
      try { chosen = root.hasAttribute('data-theme-toggle') && localStorage.getItem('theme'); } catch (err) { /* bỏ qua */ }
      if (!chosen) root.dataset.theme = e.matches ? 'light' : 'dark';
    });
  }

  /* Hiệu ứng xuất hiện */
  const items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    items.forEach((el) => io.observe(el));
  } else {
    items.forEach((el) => el.classList.add('is-in'));
  }

  /* Lọc video theo danh mục */
  document.querySelectorAll('.portfolio').forEach((sec) => {
    const buttons = sec.querySelectorAll('.filter');
    buttons.forEach((btn) =>
      btn.addEventListener('click', () => {
        const cat = btn.dataset.filter;
        buttons.forEach((b) => b.classList.toggle('is-active', b === btn));
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
      })
    );
  });

  /* Nút ‹ › của dải đánh giá */
  document.querySelectorAll('.reviews').forEach((sec) => {
    const track = sec.querySelector('.reviews__track');
    const nav = sec.querySelector('.reviews__nav');
    if (!track || !nav) return;
    const [prev, next] = nav.querySelectorAll('.reviews__arrow');
    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      nav.hidden = max <= 2; // vừa đủ chỗ thì không cần nút
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= max - 2;
    };
    nav.addEventListener('click', (e) => {
      const btn = e.target.closest('.reviews__arrow');
      if (!btn) return;
      const card = track.querySelector('.review');
      const step = card ? card.getBoundingClientRect().width + 16 : track.clientWidth * 0.8;
      track.scrollBy({ left: step * Number(btn.dataset.dir), behavior: 'smooth' });
    });
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  });

  /* Lightbox xem video */
  const box = document.querySelector('.lightbox');
  if (!box) return;
  const frame = box.querySelector('.lightbox__frame');
  const inner = box.querySelector('.lightbox__box');
  let lastFocus = null;

  function open(el) {
    const { embed, provider, link, vertical } = el.dataset;
    if (!embed) {
      if (link) window.open(link, '_blank', 'noopener');
      return;
    }
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
    inner.classList.toggle('is-vertical', vertical === '1');
    box.hidden = false;
    document.body.style.overflow = 'hidden';
    box.querySelector('.lightbox__close').focus();
  }

  function close() {
    box.hidden = true;
    frame.textContent = '';
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('.js-video');
    if (trigger) return open(trigger);
    if (e.target.closest('[data-close]')) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !box.hidden) close();
  });
})();
