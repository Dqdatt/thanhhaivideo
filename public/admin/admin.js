/* Trang quản trị portfolio — JavaScript thuần, lưu nội dung & file trên Supabase.
 * Bấm Lưu = cập nhật bảng site_content -> trang web hiện nội dung mới ngay khi người xem mở trang. */
(() => {
  const $app = document.getElementById('app');
  const CFG = window.PORTFOLIO_CONFIG;
  const P = window.Portfolio; // renderPage, renderProjectPage, normalizeContent, slugify, FONTS… (từ portfolio.bundle.js)
  const sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  const bucket = () => sb.storage.from(CFG.bucket);
  const SITE = new URL('../', location.href).href; // gốc trang web (admin nằm ở /admin/)
  const state = {
    user: null,
    meta: null,
    content: null,
    savedJson: '',
    version: null, // updated_at của nội dung đang sửa, dùng để phát hiện xung đột khi lưu
    tab: 'videos',
    editing: null, // id dự án đang sửa (tab Dự án)
    unread: 0, // số tin nhắn liên hệ chưa đọc
    openSection: null,
    showPreview: localGet('preview') !== '0',
    previewMode: 'desktop',
    saving: false,
  };

  /* ================= Tiện ích ================= */

  function localGet(k) {
    try { return localStorage.getItem('adm_' + k); } catch { return null; }
  }
  function localSet(k, v) {
    try { localStorage.setItem('adm_' + k, v); } catch { /* bỏ qua */ }
  }

  // Tạo phần tử DOM: h('div', {class:'x', onclick: fn}, child1, 'text', ...)
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k in el && typeof v !== 'string') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }

  const ICONS = {
    film: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 7.5h4M3 12h18M3 16.5h4M17 7.5h4M17 16.5h4"/>',
    video: '<path d="M15 10l5-3v10l-5-3"/><rect x="2" y="6" width="13" height="12" rx="2"/>',
    layout: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    profile: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="11" r="2.5"/><path d="M5.5 17a3.5 3.5 0 0 1 7 0M15 10h3M15 14h3"/>',
    camera: '<path d="M15 10l5-3v10l-5-3"/><rect x="2" y="6" width="13" height="12" rx="2"/><circle cx="8.5" cy="12" r="2.5"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    archive: '<rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4"/>',
    grip: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    external: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    library: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>',
    reply: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
  };
  const icon = (name) => {
    const span = document.createElement('span');
    span.style.display = 'contents';
    span.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
    return span.firstChild;
  };

  /* ---- Supabase ---- */

  // Đổi lỗi Supabase sang tiếng Việt dễ hiểu
  function sbError(error) {
    const msg = (error && (error.message || error.error_description)) || String(error);
    if (/invalid login credentials/i.test(msg)) return 'Sai tên đăng nhập hoặc mật khẩu';
    if (/email not confirmed/i.test(msg)) return 'Email chưa được xác nhận';
    if (/rate limit|too many/i.test(msg)) return 'Thao tác quá nhiều lần, thử lại sau ít phút';
    if (/jwt expired|session/i.test(msg)) return 'Phiên đăng nhập đã hết hạn, hãy đăng nhập lại';
    if (/row-level security|permission denied/i.test(msg)) return 'Tài khoản không có quyền thực hiện thao tác này';
    if (/contact_messages/i.test(msg)) return 'Chưa có bảng tin nhắn — hãy chạy lại file supabase/setup.sql';
    if (/site_content|schema cache/i.test(msg)) return 'Chưa thiết lập database — hãy chạy file supabase/setup.sql';
    if (/should be at least|weak password/i.test(msg)) return 'Mật khẩu quá ngắn hoặc quá dễ đoán';
    if (/same.*password|different from the old/i.test(msg)) return 'Mật khẩu mới phải khác mật khẩu cũ';
    if (/payload too large|exceeded the maximum/i.test(msg)) return 'File quá lớn (tối đa 50MB)';
    if (/mime type/i.test(msg)) return 'Định dạng file không được hỗ trợ';
    if (/failed to fetch|network/i.test(msg)) return 'Không kết nối được máy chủ, kiểm tra mạng';
    return msg;
  }
  const must = ({ data, error }) => {
    if (error) throw new Error(sbError(error));
    return data;
  };

  async function loadContent() {
    const row = must(await sb.from('site_content').select('content, updated_at').eq('id', 1).maybeSingle());
    if (!row) throw new Error('Chưa có nội dung trong database — hãy chạy file supabase/setup.sql');
    state.version = row.updated_at;
    return P.normalizeContent(row.content);
  }

  // Tên đăng nhập "admin" = email admin@<loginDomain> trên Supabase Auth (gõ email đầy đủ cũng được)
  const toEmail = (name) => {
    const v = String(name || '').trim().toLowerCase();
    return v.includes('@') ? v : `${v}@${CFG.loginDomain}`;
  };
  const toUsername = (email) => {
    const suffix = `@${CFG.loginDomain}`;
    return email && email.toLowerCase().endsWith(suffix) ? email.slice(0, -suffix.length) : email;
  };

  const publicUrl = (path) => bucket().getPublicUrl(path).data.publicUrl;

  // Đường dẫn ảnh dùng trong trang admin (ảnh cũ dạng 'uploads/...' nằm ở gốc web)
  function assetUrl(u) {
    if (!u) return '';
    if (/^\/?uploads\//.test(u)) return SITE + u.replace(/^\//, '');
    return u;
  }

  function toast(msg, type = 'ok') {
    const el = h('div', { class: `toast toast--${type}` }, msg);
    document.getElementById('toasts').append(el);
    setTimeout(() => el.remove(), type === 'err' ? 5000 : 2600);
  }

  const uid = (p = '') => p + Math.random().toString(36).slice(2, 9);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const fmtSize = (b) => (b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
  const isImage = (u) => /\.(jpe?g|png|webp|gif|avif|ico)(\?|$)/i.test(u) || /images\.unsplash|ytimg|vumbnail|googleusercontent/.test(u);

  /* ================= Modal & hộp thoại ================= */

  function modal({ title, body, foot, wide, onClose }) {
    const close = () => {
      wrap.remove();
      document.removeEventListener('keydown', onKey);
      onClose && onClose();
    };
    const onKey = (e) => e.key === 'Escape' && close();
    const wrap = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' },
      h('div', { class: 'modal__bg', onclick: close }),
      h('div', { class: `modal__box${wide ? ' modal__box--wide' : ''}` },
        h('div', { class: 'modal__head' }, h('h3', {}, title), h('button', { class: 'btn btn--ghost btn--icon', 'aria-label': 'Đóng', onclick: close }, icon('x'))),
        h('div', { class: 'modal__body' }, body),
        foot ? h('div', { class: 'modal__foot' }, typeof foot === 'function' ? foot(close) : foot) : null
      )
    );
    document.addEventListener('keydown', onKey);
    document.body.append(wrap);
    const first = wrap.querySelector('input, textarea, select');
    if (first) setTimeout(() => first.focus(), 30);
    return close;
  }

  function confirmBox(message, { ok = 'Đồng ý', danger = false } = {}) {
    return new Promise((resolve) => {
      let result = false;
      modal({
        title: 'Xác nhận',
        body: h('p', { style: { margin: 0 } }, message),
        onClose: () => resolve(result),
        foot: (close) => [
          h('button', { class: 'btn', onclick: close }, 'Huỷ'),
          h('button', { class: `btn ${danger ? 'btn--danger' : 'btn--primary'}`, onclick: () => { result = true; close(); } }, ok),
        ],
      });
    });
  }

  /* ================= Trạng thái thay đổi & lưu ================= */

  const isDirty = () => state.content && JSON.stringify(state.content) !== state.savedJson;

  function changed(opts = {}) {
    updateDirty();
    schedulePreview();
    if (opts.rerender) renderMain();
  }

  function updateDirty() {
    const dirty = isDirty();
    const ind = document.querySelector('.dirty');
    const btn = document.querySelector('.js-save');
    if (ind) ind.classList.toggle('hidden', !dirty);
    if (btn) btn.disabled = !dirty || state.saving;
    const counts = document.querySelectorAll('[data-count]');
    counts.forEach((c) => {
      if (c.dataset.count === 'videos') c.textContent = state.content.videos.length;
      if (c.dataset.count === 'sections') c.textContent = state.content.sections.filter((s) => s.enabled).length;
      if (c.dataset.count === 'messages') {
        c.textContent = state.unread || '';
        c.classList.toggle('count--new', state.unread > 0);
      }
    });
  }

  async function save() {
    if (!isDirty() || state.saving) return;
    state.saving = true;
    updateDirty();
    try {
      const next = P.normalizeContent(state.content);
      // Chỉ ghi nếu nội dung trên server chưa bị ai khác thay đổi kể từ lúc tải
      let rows = must(await sb.from('site_content').update({ content: next }).eq('id', 1).eq('updated_at', state.version).select('updated_at'));
      if (!rows.length) {
        const cur = must(await sb.from('site_content').select('updated_at').eq('id', 1).maybeSingle());
        if (!cur || cur.updated_at === state.version) throw new Error('Tài khoản không có quyền sửa nội dung');
        const ok = await confirmBox('Nội dung vừa được thay đổi ở nơi khác (máy khác hoặc tab khác). Ghi đè bằng nội dung bạn đang sửa?', { ok: 'Ghi đè', danger: true });
        if (!ok) return;
        rows = must(await sb.from('site_content').update({ content: next }).eq('id', 1).select('updated_at'));
      }
      state.version = rows[0].updated_at;
      setContent(next);
      renderMain();
      toast('Đã lưu — trang web đã cập nhật');
      setDeployChip('Web đã cập nhật ✓', 'ok');
      clearTimeout(deployTimer);
      deployTimer = setTimeout(() => setDeployChip('', 'ok'), 6000);
    } catch (err) {
      toast(err.message, 'err');
    } finally {
      state.saving = false;
      updateDirty();
    }
  }

  // Chip trạng thái trên thanh trên cùng
  let deployTimer = null;
  function setDeployChip(text, kind) {
    const chip = document.querySelector('.deploy');
    if (!chip) return;
    chip.className = `deploy deploy--${kind}`;
    chip.textContent = text;
    chip.classList.toggle('hidden', !text);
  }
  function setContent(content) {
    state.content = content;
    state.savedJson = JSON.stringify(content);
  }

  window.addEventListener('beforeunload', (e) => {
    if (isDirty()) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's' && state.user) {
      e.preventDefault();
      save();
    }
  });

  /* ================= Xem trước ================= */

  let previewTimer = null;
  let previewSeq = 0;
  function schedulePreview(delay = 450) {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(updatePreview, delay);
  }

  async function updatePreview() {
    const frame = document.querySelector('.preview iframe');
    if (!frame || !state.content || frame.offsetParent === null) return;
    const seq = ++previewSeq;
    try {
      const content = P.normalizeContent(state.content);
      const opts = { preview: true, base: SITE, version: 'preview' };
      // Đang sửa một dự án: xem trước trang của dự án đó
      const key = state.tab === 'videos' && state.editing ? state.editing : '';
      const html = (key && P.renderProjectPage(content, key, opts)) || P.renderPage(content, opts);
      if (seq !== previewSeq) return;
      let scroll = 0;
      try { if (frame.dataset.key === key) scroll = frame.contentWindow.scrollY; } catch { /* bỏ qua */ }
      frame.dataset.key = key;
      frame.onload = () => {
        try {
          frame.contentDocument.documentElement.style.scrollBehavior = 'auto';
          frame.contentWindow.scrollTo(0, scroll);
          // Không cho link trong bản xem trước điều hướng khỏi trang
          frame.contentDocument.addEventListener('click', (e) => {
            const a = e.target.closest('a');
            if (!a) return;
            // Bấm vào thẻ dự án: mở trình sửa dự án đó
            if (a.dataset.project) {
              e.preventDefault();
              return openProject(a.dataset.project);
            }
            const href = a.getAttribute('href') || '';
            if (href.startsWith('#')) {
              e.preventDefault();
              const t = href.length > 1 && frame.contentDocument.getElementById(href.slice(1));
              if (t) t.scrollIntoView({ behavior: 'smooth' });
            } else e.preventDefault();
          });
        } catch { /* bỏ qua */ }
      };
      frame.srcdoc = html;
    } catch { /* bỏ qua lỗi xem trước */ }
  }

  function scrollPreviewTo(id) {
    const frame = document.querySelector('.preview iframe');
    try {
      const el = frame.contentDocument.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch { /* bỏ qua */ }
  }

  /* ================= Upload ================= */

  const FILE_EXT = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif',
    'image/x-icon': 'ico', 'image/vnd.microsoft.icon': 'ico',
    'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
  };
  const MAX_FILE_MB = 50; // giới hạn mỗi file của gói Supabase miễn phí
  const isVideoFile = (u) => /\.(mp4|webm|mov)(\?|$)/i.test(u);

  // Tải file lên Supabase Storage, trả về link công khai
  async function uploadFile(file, { onlyImages = false } = {}) {
    const ext = FILE_EXT[file.type];
    if (!ext || (onlyImages && file.type.startsWith('video/'))) {
      throw new Error(onlyImages ? 'Chỉ hỗ trợ ảnh JPG, PNG, WEBP, GIF, AVIF, ICO' : 'Chỉ hỗ trợ ảnh (JPG, PNG, WEBP, GIF, AVIF, ICO) hoặc video (MP4, WEBM, MOV)');
    }
    if (file.size > MAX_FILE_MB * 1048576) {
      throw new Error(`File tối đa ${MAX_FILE_MB}MB. ${file.type.startsWith('video/') ? 'Video dài hãy đưa lên YouTube/Drive rồi dán link.' : 'Hãy nén ảnh trước (ví dụ squoosh.app).'}`);
    }
    const path = `uploads/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const t = h('div', { class: 'toast' }, `Đang tải lên ${file.name}…`);
    document.getElementById('toasts').append(t);
    try {
      must(await bucket().upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false }));
      return publicUrl(path);
    } finally {
      t.remove();
    }
  }

  async function listUploads() {
    const items = must(await bucket().list('uploads', { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } }));
    return items
      .filter((f) => f.id && !f.name.startsWith('.'))
      .map((f) => ({ name: f.name, path: `uploads/${f.name}`, size: (f.metadata && f.metadata.size) || 0, url: publicUrl(`uploads/${f.name}`) }));
  }

  function pickFile(accept) {
    return new Promise((resolve) => {
      const inp = h('input', { type: 'file', accept, style: { display: 'none' } });
      inp.addEventListener('change', () => resolve(inp.files[0] || null));
      document.body.append(inp);
      inp.click();
      setTimeout(() => inp.remove(), 60000);
    });
  }

  async function openLibrary({ images = true } = {}) {
    const files = await listUploads();
    const list = files.filter((f) => (images ? isImage(f.url) : true));
    return new Promise((resolve) => {
      let picked = null;
      const close = modal({
        title: 'Chọn từ thư viện',
        wide: true,
        onClose: () => resolve(picked),
        body: list.length
          ? h('div', { class: 'files files--pick' }, list.map((f) =>
              h('div', { class: 'file', onclick: () => { picked = f.url; close(); } },
                h('div', { class: 'file__img', style: { backgroundImage: `url("${assetUrl(f.url)}")` } }),
                h('div', { class: 'file__meta' }, h('span', {}, f.name)))))
          : h('p', { class: 'muted' }, 'Thư viện trống. Hãy tải ảnh lên trước.'),
      });
    });
  }

  /* ================= Trường nhập liệu ================= */

  // Trường gắn trực tiếp vào obj[key]
  function field(obj, key, o = {}) {
    const type = o.type || 'text';
    const update = (v) => {
      obj[key] = v;
      o.onChange && o.onChange(v);
      changed({ rerender: !!o.rerender });
    };
    let control;
    if (type === 'textarea') {
      control = h('textarea', { rows: o.rows || 4, placeholder: o.placeholder || '', oninput: (e) => update(e.target.value) });
      control.value = obj[key] || '';
    } else if (type === 'lines') {
      control = h('textarea', { rows: o.rows || 3, placeholder: o.placeholder || '', oninput: (e) => update(e.target.value.split('\n')) });
      control.value = (obj[key] || []).join('\n');
    } else if (type === 'select') {
      control = h('select', { onchange: (e) => update(o.number ? Number(e.target.value) : e.target.value) },
        o.options.map((opt) => {
          const [val, label] = Array.isArray(opt) ? opt : [opt, opt];
          return h('option', { value: val, selected: String(obj[key]) === String(val) }, label);
        }));
    } else if (type === 'switch') {
      return h('label', { class: 'switch' },
        h('input', { type: 'checkbox', checked: !!obj[key], onchange: (e) => update(e.target.checked) }),
        h('i'), o.label);
    } else if (type === 'color') {
      const text = h('input', { class: 'input', value: obj[key] || '', maxlength: 7, oninput: (e) => {
        if (/^#[0-9a-f]{6}$/i.test(e.target.value)) { picker.value = e.target.value; update(e.target.value); }
      } });
      const picker = h('input', { type: 'color', value: obj[key] || '#000000', oninput: (e) => { text.value = e.target.value; update(e.target.value); } });
      control = h('div', { class: 'color-row' }, picker, text);
    } else {
      control = h('input', {
        type: type === 'number' ? 'number' : type,
        placeholder: o.placeholder || '',
        min: o.min, max: o.max,
        list: o.list,
        oninput: (e) => update(type === 'number' ? Number(e.target.value) || 0 : e.target.value),
      });
      control.value = obj[key] == null ? '' : obj[key];
    }
    return h('label', { class: 'field' }, o.label ? h('span', {}, o.label) : null, control, o.hint ? h('small', {}, o.hint) : null);
  }

  // Ô chọn ảnh: dán URL / tải lên / chọn từ thư viện
  // o.ratio (ví dụ '16 / 9'): xem trước ảnh lớn đúng khung như trên trang chủ
  function imageField(obj, key, o = {}) {
    const preview = h('div', { class: 'img-field__preview', style: o.ratio ? { aspectRatio: o.ratio, maxWidth: o.maxWidth || '' } : null });
    const input = h('input', { class: 'input', placeholder: 'Dán link ảnh hoặc bấm Tải lên', oninput: (e) => set(e.target.value, false) });
    input.value = obj[key] || '';
    function paint() {
      const u = obj[key];
      preview.textContent = '';
      preview.style.backgroundImage = u ? `url("${assetUrl(u).replace(/"/g, '%22')}")` : '';
      if (!u) preview.append(icon('image'));
    }
    function set(v, syncInput = true) {
      obj[key] = v;
      if (syncInput) input.value = v;
      paint();
      changed();
    }
    paint();
    return h('div', { class: 'field' },
      o.label ? h('span', {}, o.label) : null,
      h('div', { class: `img-field${o.ratio ? ' img-field--large' : ''}` }, preview,
        h('div', { class: 'img-field__side' }, input,
          h('div', { class: 'row row--wrap' },
            h('button', { type: 'button', class: 'btn btn--sm', onclick: async () => {
              const f = await pickFile('image/*');
              if (!f) return;
              try { set(await uploadFile(f, { onlyImages: true })); } catch (err) { toast(err.message, 'err'); }
            } }, icon('upload'), 'Tải lên'),
            h('button', { type: 'button', class: 'btn btn--sm', onclick: async () => {
              const u = await openLibrary();
              if (u) set(u);
            } }, icon('library'), 'Thư viện'),
            h('button', { type: 'button', class: 'btn btn--sm btn--ghost', onclick: () => set('') }, 'Xoá')))),
      o.hint ? h('small', {}, o.hint) : null);
  }

  /* ================= Kéo thả sắp xếp (chuột + cảm ứng) ================= */

  function makeSortable(container, arr, onDone) {
    container.addEventListener('pointerdown', (e) => {
      const handle = e.target.closest('.handle');
      if (!handle) return;
      const item = handle.closest('[data-index]');
      if (!item || item.parentElement !== container) return;
      e.preventDefault();
      const items = [...container.children].filter((c) => c.dataset.index != null);
      const from = Number(item.dataset.index);
      let to = from;
      const scroller = document.querySelector('.main');
      item.classList.add('dragging');
      handle.setPointerCapture(e.pointerId);

      const move = (ev) => {
        items.forEach((i) => i.classList.remove('drop-before', 'drop-after'));
        let target = items[items.length - 1];
        let after = true;
        for (const it of items) {
          const r = it.getBoundingClientRect();
          if (ev.clientY < r.top + r.height / 2) { target = it; after = false; break; }
        }
        const ti = Number(target.dataset.index);
        to = after ? ti + 1 : ti;
        if (to > from) to -= 1;
        if (to !== from) target.classList.add(after ? 'drop-after' : 'drop-before');
        // Tự cuộn khi kéo gần mép
        if (scroller) {
          const sr = scroller.getBoundingClientRect();
          if (ev.clientY < sr.top + 60) scroller.scrollBy(0, -14);
          else if (ev.clientY > sr.bottom - 60) scroller.scrollBy(0, 14);
        }
      };
      const end = () => {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', end);
        handle.removeEventListener('pointercancel', end);
        items.forEach((i) => i.classList.remove('drop-before', 'drop-after', 'dragging'));
        if (to !== from) {
          const [x] = arr.splice(from, 1);
          arr.splice(to, 0, x);
          onDone();
        }
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', end);
      handle.addEventListener('pointercancel', end);
    });
  }

  const gripHandle = () => h('span', { class: 'handle', title: 'Kéo để sắp xếp', 'aria-label': 'Kéo để sắp xếp' }, icon('grip'));

  /* ================= Đăng nhập ================= */

  function loginShell(...kids) {
    $app.replaceChildren(h('div', { class: 'login' }, h('form', kids[0], ...kids.slice(1))));
  }

  function renderLogin(message) {
    const err = h('p', { class: 'error' }, message || '');
    const user = h('input', { name: 'username', autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false', required: true, placeholder: 'admin' });
    const pass = h('input', { name: 'password', type: 'password', autocomplete: 'current-password', required: true });
    const btn = h('button', { class: 'btn btn--primary', type: 'submit' }, 'Đăng nhập');
    loginShell({ onsubmit: async (e) => {
      e.preventDefault();
      err.textContent = '';
      btn.disabled = true;
      try {
        must(await sb.auth.signInWithPassword({ email: toEmail(user.value), password: pass.value }));
        await signIn();
        await boot();
      } catch (ex) {
        err.textContent = ex.message;
      } finally {
        btn.disabled = false;
      }
    } },
      h('div', { class: 'brand' }, h('span', { class: 'brand__mark' }, icon('film')), 'Quản trị Portfolio'),
      h('h1', {}, 'Đăng nhập'),
      h('p', {}, 'Quản lý video, bố cục và thông tin trang web.'),
      h('label', { class: 'field' }, h('span', {}, 'Tên đăng nhập'), user),
      h('label', { class: 'field' }, h('span', {}, 'Mật khẩu'), pass),
      err, btn,
      h('a', { href: SITE, style: { fontSize: '13px', textAlign: 'center' } }, '← Về trang chủ'));
    user.focus();
  }

  // Sau khi đăng nhập: kiểm tra tài khoản có quyền sửa web không
  async function signIn() {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error('Phiên đăng nhập đã hết hạn, hãy đăng nhập lại');
    const row = must(await sb.from('portfolio_admins').select('role, label').eq('email', (user.email || '').toLowerCase()).maybeSingle());
    if (!row) {
      await sb.auth.signOut();
      throw new Error('Tài khoản này không có quyền sửa web.');
    }
    state.user = { username: toUsername(user.email), email: user.email, role: row.role };
  }

  /* ================= Khung ứng dụng ================= */

  // Các khối trang chủ (theo thứ tự trên trang) | null = vạch ngăn
  const SECTION_TABS = ['showreel', 'profile', 'bts', 'contact'];
  const TABS = [
    ['heading', 'Trang chủ'],
    ['showreel', 'Showreel', 'play'],
    ['profile', 'Giới thiệu', 'profile'],
    ['videos', 'Dự án & danh mục', 'video', 'videos'],
    ['bts', 'Hậu trường', 'camera'],
    ['contact', 'Liên hệ', 'phone'],
    ['layout', 'Bố cục & menu', 'layout', 'sections'],
    null,
    ['messages', 'Tin nhắn', 'mail', 'messages'],
    ['settings', 'Cài đặt', 'settings'],
    ['files', 'Thư viện file', 'image'],
    ['account', 'Tài khoản', 'user'],
    ['backup', 'Sao lưu', 'archive'],
  ];

  function renderApp() {
    const body = h('div', { class: `body${state.showPreview ? '' : ' no-preview'}` },
      h('nav', { class: 'sidebar' }, TABS.map((t) => {
        if (!t) return h('hr', { class: 'tab-sep' });
        const [id, label, ic, count] = t;
        if (id === 'heading') return h('div', { class: 'tab-heading' }, label);
        // Bấm tab Dự án khi đang sửa một dự án: về danh sách dự án
        const open = () => {
          if (id === 'videos' && state.editing) {
            state.editing = null;
            schedulePreview(0);
          }
          switchTab(id);
        };
        return h('button', { class: `tab${state.tab === id ? ' is-active' : ''}`, 'data-tab': id, onclick: open },
          icon(ic), label, count ? h('span', { class: 'count', 'data-count': count }) : null);
      })),
      h('div', { class: 'main' }),
      h('aside', { class: `preview${state.previewMode === 'mobile' ? ' is-mobile' : ''}` },
        h('div', { class: 'preview__bar' },
          icon('eye'), 'Xem trước (chưa lưu)', h('span', { class: 'spacer' }),
          h('div', { class: 'seg' },
            ['desktop', 'mobile'].map((m) => h('button', {
              class: state.previewMode === m ? 'is-active' : '',
              onclick: (e) => {
                state.previewMode = m;
                e.target.parentElement.querySelectorAll('button').forEach((b) => b.classList.toggle('is-active', b === e.target));
                document.querySelector('.preview').classList.toggle('is-mobile', m === 'mobile');
              },
            }, m === 'desktop' ? 'Máy tính' : 'Điện thoại'))),
          h('button', { class: 'btn btn--sm btn--ghost close-mobile-preview', onclick: () => togglePreview(false) }, icon('x'))),
        h('div', { class: 'preview__wrap' }, h('iframe', { title: 'Xem trước' }))));

    $app.replaceChildren(h('div', { class: 'app' },
      h('header', { class: 'topbar' },
        h('div', { class: 'brand' }, h('span', { class: 'brand__mark' }, icon('film')), h('span', { class: 'hide-sm' }, state.content.settings.siteName || 'Portfolio')),
        h('span', { class: 'dirty hidden' }, 'Chưa lưu'),
        h('span', { class: 'deploy hidden' }),
        h('span', { class: 'spacer' }),
        h('button', { class: 'btn btn--ghost js-preview-toggle', onclick: () => togglePreview() }, icon('eye'), h('span', { class: 'hide-sm' }, 'Xem trước')),
        h('a', { class: 'btn btn--ghost', href: SITE, target: '_blank', rel: 'noopener' }, icon('external'), h('span', { class: 'hide-sm' }, 'Mở trang')),
        h('button', { class: 'btn btn--primary js-save', disabled: true, onclick: save, title: 'Ctrl/Cmd + S' }, 'Lưu thay đổi'),
        h('span', { class: 'user-chip' }, h('b', {}, state.user.username), h('span', { class: `role role--${state.user.role}` }, state.user.role)),
        h('button', { class: 'btn btn--ghost btn--icon', title: 'Đăng xuất', 'aria-label': 'Đăng xuất', onclick: logout }, icon('logout'))),
      body));
    renderMain();
    updateDirty();
    schedulePreview(0);
  }

  function togglePreview(force) {
    const body = document.querySelector('.body');
    const small = window.matchMedia('(max-width: 1080px)').matches;
    if (small) {
      const show = force === undefined ? !body.classList.contains('show-preview-mobile') : force;
      body.classList.toggle('show-preview-mobile', show);
      if (show) schedulePreview(0);
      return;
    }
    state.showPreview = force === undefined ? !state.showPreview : force;
    localSet('preview', state.showPreview ? '1' : '0');
    body.classList.toggle('no-preview', !state.showPreview);
    if (state.showPreview) schedulePreview(0);
  }

  function switchTab(id) {
    const wasProject = state.tab === 'videos' && state.editing;
    state.tab = id;
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('is-active', t.dataset.tab === id));
    renderMain();
    document.querySelector('.main').scrollTop = 0;
    // Xem trước đổi giữa trang chủ và trang dự án
    if (wasProject || (id === 'videos' && state.editing)) schedulePreview(0);
    // Tab của một khối trang chủ: cuộn bản xem trước tới khối đó
    const sec = SECTION_TABS.includes(id) && state.content.sections.find((s) => s.type === id);
    const portfolio = id === 'videos' && !state.editing && state.content.sections.find((s) => s.type === 'portfolio');
    if (sec || portfolio) setTimeout(() => scrollPreviewTo((sec || portfolio).id), wasProject ? 700 : 0);
  }

  async function logout() {
    if (isDirty() && !(await confirmBox('Bạn có thay đổi chưa lưu. Vẫn đăng xuất?', { ok: 'Đăng xuất', danger: true }))) return;
    await sb.auth.signOut();
    state.user = null;
    state.content = null;
    state.savedJson = JSON.stringify(state.content);
    render();
  }

  function renderMain() {
    const main = document.querySelector('.main');
    if (!main) return;
    const views = { videos: viewVideos, layout: viewLayout, messages: viewMessages, settings: viewSettings, files: viewFiles, account: viewAccount, backup: viewBackup };
    SECTION_TABS.forEach((type) => { views[type] = () => viewSectionTab(type); });
    main.replaceChildren(views[state.tab]());
    updateDirty();
  }

  const pageHead = (title, desc, ...actions) =>
    h('div', { class: 'page-head' }, h('div', { style: { flex: 1, minWidth: '220px' } }, h('h2', {}, title), desc ? h('p', {}, desc) : null), ...actions);

  /* ================= Tab: Dự án ================= */

  const PROVIDER_LABEL = { youtube: 'YouTube', vimeo: 'Vimeo', drive: 'Google Drive', tiktok: 'TikTok', facebook: 'Facebook', file: 'File video' };

  function thumbFor(v) {
    if (v.thumbnail) return assetUrl(v.thumbnail);
    const info = VideoUtils.parse(v.url);
    return (info && info.thumbnail) || '';
  }

  // Danh mục theo thứ tự admin sắp xếp (cũng là thứ tự nút lọc trên trang chủ)
  function categories() {
    if (!Array.isArray(state.content.categories)) state.content.categories = [];
    const list = state.content.categories;
    state.content.videos.forEach((v) => { if (v.category && !list.includes(v.category)) list.push(v.category); });
    return list;
  }

  // Thêm danh mục mới, trả về tên đã thêm (hoặc danh mục trùng tên đã có)
  function addCategory(name) {
    const n = String(name || '').trim().slice(0, 60);
    if (!n) return '';
    const list = categories();
    const same = list.find((c) => c.toLowerCase() === n.toLowerCase());
    if (same) return same;
    list.push(n);
    return n;
  }

  function categoryManager() {
    const list = categories();
    const count = (c) => state.content.videos.filter((v) => v.category === c).length;
    const rows = h('div', { class: 'cat-list' }, list.map((c, i) => {
      const name = h('input', { class: 'input', value: c, 'aria-label': 'Tên danh mục' });
      // Đổi tên: cập nhật luôn các dự án đang dùng danh mục này
      name.addEventListener('change', () => {
        const n = name.value.trim().slice(0, 60);
        if (!n || n === c) { name.value = c; return; }
        if (list.some((x, j) => j !== i && x.toLowerCase() === n.toLowerCase())) {
          toast('Đã có danh mục này', 'err');
          name.value = c;
          return;
        }
        list[i] = n;
        state.content.videos.forEach((v) => { if (v.category === c) v.category = n; });
        changed({ rerender: true });
      });
      return h('div', { class: 'cat', 'data-index': i },
        gripHandle(), name,
        h('span', { class: 'dim cat__count' }, `${count(c)} dự án`),
        h('button', { class: 'btn btn--ghost btn--icon btn--danger', title: 'Xoá', 'aria-label': `Xoá danh mục ${c}`, onclick: async () => {
          const n = count(c);
          if (n && !(await confirmBox(`Xoá danh mục "${c}"? ${n} dự án đang thuộc danh mục này sẽ không còn danh mục.`, { ok: 'Xoá', danger: true }))) return;
          list.splice(i, 1);
          state.content.videos.forEach((v) => { if (v.category === c) v.category = ''; });
          changed({ rerender: true });
        } }, icon('trash')));
    }));
    makeSortable(rows, list, () => changed({ rerender: true }));

    const input = h('input', { class: 'input', placeholder: 'Tên danh mục mới, ví dụ: TVC / Commercial' });
    const add = () => {
      const before = list.length;
      const n = addCategory(input.value);
      if (!n) return input.focus();
      if (list.length === before) return toast('Đã có danh mục này', 'err');
      input.value = '';
      changed({ rerender: true });
    };
    input.addEventListener('keydown', (e) => e.key === 'Enter' && add());
    return h('div', { class: 'panel stack' },
      h('h3', {}, 'Danh mục (nút lọc trên trang chủ)'),
      h('p', { class: 'dim', style: { margin: '-8px 0 0' } }, 'Kéo ⋮⋮ để đổi thứ tự nút lọc, sửa tên trực tiếp trong ô. Danh mục chưa có dự án nào sẽ không hiện trên trang.'),
      list.length ? rows : null,
      h('div', { class: 'row' }, input, h('button', { class: 'btn', onclick: add }, icon('plus'), 'Thêm danh mục')));
  }

  // Ô chọn danh mục của dự án (có lựa chọn thêm danh mục mới)
  function categorySelect(p) {
    const NEW = '__new__';
    const sel = h('select', { onchange: () => {
      if (sel.value !== NEW) {
        p.category = sel.value;
        changed();
        return;
      }
      sel.value = p.category || '';
      const inp = h('input', { placeholder: 'Ví dụ: Music video' });
      modal({
        title: 'Thêm danh mục',
        body: h('label', { class: 'field' }, h('span', {}, 'Tên danh mục'), inp),
        foot: (close) => {
          const ok = () => {
            const n = addCategory(inp.value);
            if (!n) return inp.focus();
            p.category = n;
            close();
            changed({ rerender: true });
          };
          inp.addEventListener('keydown', (e) => e.key === 'Enter' && ok());
          return [h('button', { class: 'btn', onclick: close }, 'Huỷ'), h('button', { class: 'btn btn--primary', onclick: ok }, 'Thêm')];
        },
      });
    } },
      h('option', { value: '' }, '— Không có danh mục —'),
      categories().map((c) => h('option', { value: c, selected: c === p.category }, c)),
      h('option', { value: NEW }, '＋ Thêm danh mục mới…'));
    return sel;
  }

  // Đường dẫn trang chi tiết của dự án (theo nội dung đã chuẩn hoá)
  function projectUrl(p) {
    const n = P.normalizeContent(state.content).videos.find((v) => v.id === p.id);
    return n ? `${SITE}du-an/${encodeURIComponent(n.slug)}/` : SITE;
  }

  function openProject(id) {
    state.editing = id;
    if (state.tab !== 'videos') switchTab('videos');
    else renderMain();
    document.querySelector('.main').scrollTop = 0;
    schedulePreview(0);
  }

  function closeProject() {
    state.editing = null;
    renderMain();
    schedulePreview(0);
  }

  function newProject(url = '') {
    const p = {
      id: uid('v'), title: '', description: '', url, thumbnail: '', category: '', visible: true,
      client: '', role: '', software: '', equipment: '', year: String(new Date().getFullYear()), summary: '',
    };
    state.content.videos.unshift(p);
    changed();
    openProject(p.id);
    if (url) autoTitle(p);
  }

  // Tự lấy tiêu đề video từ YouTube/Vimeo… khi dự án chưa có tiêu đề
  async function autoTitle(p, input) {
    if (!VideoUtils.parse(p.url) || p.title) return;
    try {
      const r = await fetch('https://noembed.com/embed?url=' + encodeURIComponent(p.url)).then((x) => x.json());
      if (r.title && !p.title) {
        p.title = r.title;
        if (input && document.contains(input)) input.value = r.title;
        else renderMain();
        changed();
      }
    } catch { /* bỏ qua */ }
  }

  function viewVideos() {
    const videos = state.content.videos;
    const editing = state.editing && videos.find((v) => v.id === state.editing);
    if (editing) return viewProjectEditor(editing);
    state.editing = null;

    const quick = h('input', { class: 'input', placeholder: 'Dán link YouTube, Vimeo, Google Drive, TikTok… để tạo dự án mới' });
    const addFromQuick = () => {
      const url = quick.value.trim();
      quick.value = '';
      newProject(url);
    };
    quick.addEventListener('keydown', (e) => e.key === 'Enter' && addFromQuick());
    quick.addEventListener('paste', () => setTimeout(() => quick.value.trim() && addFromQuick(), 0));

    const list = h('div', { class: 'video-list' }, videos.map((v, i) => {
      const info = VideoUtils.parse(v.url);
      const th = thumbFor(v);
      return h('div', { class: `video-item${v.visible ? '' : ' is-off'}`, 'data-index': i },
        gripHandle(),
        h('button', { type: 'button', class: 'video-item__open', onclick: () => openProject(v.id) },
          h('div', { class: 'thumb', style: { backgroundImage: th ? `url("${th}")` : '' } }, th ? null : icon('film')),
          h('div', { class: 'video-item__info' },
            h('strong', {}, v.title || '(Chưa có tiêu đề)'),
            h('div', { class: 'row row--wrap' },
              info ? h('span', { class: `badge badge--${info.provider}` }, PROVIDER_LABEL[info.provider]) : h('span', { class: 'badge badge--bad' }, v.url ? 'Link không nhận diện' : 'Chưa có link'),
              v.category ? h('span', { class: 'badge' }, v.category) : null,
              v.role || v.client ? h('span', { class: 'badge badge--ok' }, 'Có thông tin dự án') : null))),
        h('div', { class: 'item-actions' },
          field(v, 'visible', { type: 'switch', label: h('span', { class: 'dim' }, 'Hiện'), onChange: () => setTimeout(() => renderMain(), 0) }),
          h('button', { class: 'btn btn--ghost btn--icon', title: 'Sửa', 'aria-label': 'Sửa', onclick: () => openProject(v.id) }, icon('edit')),
          h('button', { class: 'btn btn--ghost btn--icon btn--danger', title: 'Xoá', 'aria-label': 'Xoá', onclick: () => deleteProject(i) }, icon('trash'))));
    }));
    makeSortable(list, videos, () => changed({ rerender: true }));

    return h('div', {},
      pageHead('Dự án', 'Mỗi dự án có trang riêng gồm video và thông tin dự án. Bấm vào dự án để sửa, kéo ⋮⋮ để sắp xếp thứ tự trên lưới. Nhớ bấm "Lưu thay đổi".',
        h('button', { class: 'btn btn--primary', onclick: () => newProject() }, icon('plus'), 'Thêm dự án')),
      h('div', { style: { marginBottom: '18px' } }, categoryManager()),
      h('div', { class: 'quick-add' }, quick, h('button', { class: 'btn btn--primary', onclick: addFromQuick }, icon('plus'), 'Thêm')),
      videos.length ? list : h('div', { class: 'empty-state' }, 'Chưa có dự án nào. Dán link video ở ô phía trên để bắt đầu.'));
  }

  async function deleteProject(i) {
    const v = state.content.videos[i];
    if (!(await confirmBox(`Xoá dự án "${v.title || 'không tên'}"?`, { ok: 'Xoá', danger: true }))) return;
    state.content.videos.splice(i, 1);
    if (state.editing === v.id) state.editing = null;
    changed({ rerender: true });
  }

  // Danh sách con có kéo thả, thêm, xoá (định dạng video, ảnh hậu trường, chỉ số…)
  function listEditor(arr, { render, create, title, addLabel, max = 20 }) {
    const box = h('div', { class: 'sub-list' }, arr.map((it, j) =>
      h('div', { class: 'sub-item', 'data-index': j },
        h('div', { class: 'sub-item__head' }, gripHandle(),
          h('strong', { style: { flex: 1, fontWeight: 500 } }, title(it, j)),
          h('button', { class: 'btn btn--ghost btn--icon btn--danger', 'aria-label': 'Xoá', title: 'Xoá', onclick: () => { arr.splice(j, 1); changed({ rerender: true }); } }, icon('trash'))),
        render(it, j))));
    makeSortable(box, arr, () => changed({ rerender: true }));
    return h('div', { class: 'stack' },
      arr.length ? box : null,
      arr.length < max ? h('div', {}, h('button', { class: 'btn btn--sm', onclick: () => { arr.push(create()); changed({ rerender: true }); } }, icon('plus'), addLabel)) : null);
  }

  // Ô link video + nút tải file video lên
  function videoUrlField(obj, key, { label, hint, onChange } = {}) {
    const input = h('input', { placeholder: 'https://www.youtube.com/watch?v=…' });
    input.value = obj[key] || '';
    const status = h('small');
    const paint = () => {
      const info = VideoUtils.parse(obj[key]);
      status.style.color = obj[key] && !info ? 'var(--danger)' : '';
      status.textContent = !obj[key] ? hint || ''
        : info ? `Đã nhận diện: ${PROVIDER_LABEL[info.provider]}${info.provider === 'drive' ? ' — nhớ bật chia sẻ "Bất kỳ ai có đường liên kết"' : ''}`
        : 'Không nhận diện được link. Hỗ trợ: YouTube, Vimeo, Google Drive, TikTok, Facebook, file .mp4.';
    };
    const set = (v) => {
      obj[key] = v;
      paint();
      onChange && onChange(v);
      changed();
    };
    input.addEventListener('input', () => set(input.value.trim()));
    paint();
    return h('div', { class: 'field' }, label ? h('span', {}, label) : null,
      h('div', { class: 'row' }, input,
        h('button', { type: 'button', class: 'btn', title: `Tải file video lên (tối đa ${MAX_FILE_MB}MB)`, onclick: async () => {
          const f = await pickFile('video/mp4,video/webm,video/quicktime');
          if (!f) return;
          try {
            const url = await uploadFile(f);
            input.value = url;
            set(url);
          } catch (err) { toast(err.message, 'err'); }
        } }, icon('upload'), h('span', { class: 'hide-sm' }, 'Tải lên'))),
      status);
  }

  const ASPECT_OPTIONS = [['16:9', '16:9 (ngang)'], ['9:16', '9:16 (dọc, TikTok/Reels)'], ['1:1', '1:1 (vuông)'], ['4:5', '4:5 (feed dọc)'], ['21:9', '21:9 (điện ảnh)']];

  function viewProjectEditor(p) {
    const box = h('div', { class: 'video-preview' });
    function paintVideo(play = false) {
      box.textContent = '';
      const info = VideoUtils.parse(p.url);
      if (!info) {
        box.append(h('div', { class: 'ph' }, p.url ? 'Không xem trước được link này' : 'Dán link video chính để xem trước'));
        return;
      }
      if (play) {
        if (info.provider === 'file') box.append(h('video', { src: info.embed, controls: true, autoplay: true }));
        else box.append(h('iframe', { src: info.embed, allow: 'autoplay; fullscreen; encrypted-media', allowfullscreen: true }));
        return;
      }
      const th = assetUrl(p.thumbnail) || info.thumbnail;
      box.append(h('button', {
        type: 'button', class: 'ph', style: { background: th ? `#000 url("${th}") center/cover` : '#000', border: 0, cursor: 'pointer' },
        onclick: () => paintVideo(true),
      }, h('span', { class: 'btn btn--primary' }, icon('play'), 'Xem thử')));
    }
    paintVideo();

    const title = field(p, 'title', { label: 'Tên dự án', placeholder: "Ví dụ: Biti's Hunter" });
    const titleInput = title.querySelector('input');
    let titleTimer;
    const slugHint = h('small');
    const paintSlug = () => { slugHint.textContent = `Đường dẫn: /du-an/${P.slugify(p.slug || p.title) || '…'}/ — để trống sẽ tạo từ tên dự án.`; };
    titleInput.addEventListener('input', paintSlug);
    paintSlug();
    const slug = field(p, 'slug', { label: 'Đường dẫn trang (slug)', placeholder: P.slugify(p.title) || 'ten-du-an', onChange: paintSlug });
    slug.append(slugHint);

    const i = state.content.videos.indexOf(p);
    return h('div', {},
      h('div', { class: 'page-head' },
        h('button', { class: 'btn btn--ghost', onclick: closeProject }, icon('back'), 'Tất cả dự án'),
        h('span', { class: 'spacer' }),
        h('a', { class: 'btn btn--ghost', href: projectUrl(p), target: '_blank', rel: 'noopener', title: 'Mở trang dự án đã lưu' }, icon('external'), h('span', { class: 'hide-sm' }, 'Mở trang')),
        h('button', { class: 'btn btn--danger', onclick: () => deleteProject(i) }, icon('trash'), h('span', { class: 'hide-sm' }, 'Xoá dự án'))),
      h('h2', { style: { marginBottom: '16px' } }, p.title || 'Dự án mới'),

      h('div', { class: 'panel stack' }, h('h3', {}, 'Video chính'),
        videoUrlField(p, 'url', {
          hint: `Dán link YouTube/Vimeo/Drive… hoặc tải file video lên (tối đa ${MAX_FILE_MB}MB).`,
          onChange: () => { paintVideo(); clearTimeout(titleTimer); titleTimer = setTimeout(() => autoTitle(p, titleInput), 500); },
        }),
        box),

      h('div', { class: 'panel stack' }, h('h3', {}, 'Thẻ trên lưới dự án'),
        title,
        h('div', { class: 'grid-2' },
          field(p, 'description', { label: 'Dòng phụ dưới tên', placeholder: 'Ví dụ: Lead Editor, Colorist' }),
          h('label', { class: 'field' }, h('span', {}, 'Danh mục (dùng để lọc)'), categorySelect(p))),
        imageField(p, 'thumbnail', { label: 'Ảnh bìa riêng (không bắt buộc)', hint: 'Để trống sẽ tự lấy ảnh bìa từ YouTube / Vimeo / Drive.', ratio: '16 / 10', maxWidth: '420px' }),
        h('div', { class: 'grid-2' }, slug,
          h('div', { class: 'field' }, h('span', {}, 'Hiển thị'), field(p, 'visible', { type: 'switch', label: 'Hiện trên trang' })))),

      h('div', { class: 'panel stack' }, h('h3', {}, 'Thông tin dự án'),
        h('div', { class: 'grid-2' },
          field(p, 'client', { label: 'Khách hàng', placeholder: "Ví dụ: Biti's" }),
          field(p, 'role', { label: 'Vai trò', placeholder: 'Ví dụ: Lead Editor, Colorist' }),
          field(p, 'software', { label: 'Phần mềm', placeholder: 'Ví dụ: DaVinci Resolve, Premiere Pro' }),
          field(p, 'equipment', { label: 'Thiết bị', placeholder: 'Ví dụ: Sony FX6' })),
        field(p, 'year', { label: 'Năm' }),
        field(p, 'summary', { type: 'textarea', label: 'Mô tả dự án', rows: 4, placeholder: 'Brief, ý tưởng, cách xử lý dựng & màu…' }),
        h('small', { class: 'dim' }, 'Mục nào để trống sẽ không hiện trên trang.')));
  }

  /* ================= Tab: Bố cục ================= */

  const SECTION_INFO = {
    showreel: { label: 'Showreel (đầu trang)', desc: 'Khung video lớn với tiêu đề và nút ▶' },
    profile: { label: 'Giới thiệu & chỉ số', desc: 'Ảnh chân dung, liên hệ nhanh, số năm kinh nghiệm…' },
    portfolio: { label: 'Lưới dự án', desc: 'Bộ lọc danh mục + danh sách dự án' },
    bts: { label: 'Behind the scenes', desc: 'Timeline, so sánh màu trước/sau, đa định dạng, ảnh hậu trường' },
    contact: { label: 'Liên hệ & hợp tác', desc: 'Form gửi tin nhắn, địa chỉ, email, điện thoại' },
  };

  const NEW_SECTION = {
    showreel: () => ({ title: `SHOWREEL ${new Date().getFullYear()}`, subtitle: 'Crafting cinematic stories', videoUrl: '', image: '' }),
    profile: () => ({ image: '', title: 'Xin chào', text: 'Giới thiệu ngắn…', buttonText: 'Liên hệ ngay', buttonLink: '#contact', showContact: true, showSocials: true, stats: [{ value: '5+', label: 'Năm kinh nghiệm' }] }),
    portfolio: () => ({ title: 'Dự án', columns: 3, aspect: '16:10', showFilter: true, category: '', limit: 0 }),
    bts: () => ({ title: 'Behind the scenes', subtitle: 'Hậu trường kỹ thuật', timelineImage: '', beforeImage: '', afterImage: '', beforeLabel: 'LOG', afterLabel: 'Color grade', formats: [], bts: [] }),
    contact: () => ({ title: 'Liên hệ & hợp tác', text: '', showForm: true, buttonText: 'Gửi tin nhắn' }),
  };

  const linkHint = () => `Dùng #id để cuộn tới một khối, ví dụ ${state.content.sections.map((s) => '#' + s.id).slice(0, 3).join(', ')}`;

  function viewLayout() {
    const sections = state.content.sections;
    const list = h('div', {}, sections.map((sec, i) => sectionCard(sec, i)));
    makeSortable(list, sections, () => changed({ rerender: true }));

    const typeSelect = h('select', { class: 'input', style: { width: 'auto' } },
      Object.entries(SECTION_INFO).map(([t, inf]) => h('option', { value: t }, inf.label)));

    return h('div', {},
      pageHead('Bố cục trang chủ', 'Kéo ⋮⋮ để đổi thứ tự khối, bật/tắt để ẩn hiện, bấm vào khối để sửa nội dung.'),
      list,
      h('div', { class: 'quick-add', style: { marginTop: '16px', alignItems: 'center' } },
        h('span', { class: 'muted' }, 'Thêm khối mới:'), typeSelect,
        h('button', { class: 'btn btn--primary', onclick: () => {
          const type = typeSelect.value;
          const sec = { id: uid(type + '-'), type, enabled: true, navLabel: '', data: NEW_SECTION[type]() };
          sections.push(sec);
          state.openSection = sec.id;
          changed({ rerender: true });
          setTimeout(() => {
            const el = document.querySelector(`[data-sid="${sec.id}"]`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            scrollPreviewTo(sec.id);
          }, 600);
        } }, icon('plus'), 'Thêm')));
  }

  // Tab riêng của một khối trang chủ: sửa trực tiếp khối đầu tiên thuộc loại đó
  function viewSectionTab(type) {
    const info = SECTION_INFO[type];
    const sec = state.content.sections.find((s) => s.type === type);
    if (!sec) {
      return h('div', {},
        pageHead(info.label, info.desc),
        h('div', { class: 'empty-state stack', style: { alignItems: 'center' } },
          'Khối này chưa có trên trang chủ.',
          h('button', { class: 'btn btn--primary', onclick: () => {
            const at = state.content.sections.findIndex((s) => s.type === 'contact');
            const created = { id: uid(type + '-'), type, enabled: true, navLabel: '', data: NEW_SECTION[type]() };
            if (type === 'contact' || at < 0) state.content.sections.push(created);
            else state.content.sections.splice(at, 0, created);
            changed({ rerender: true });
          } }, icon('plus'), 'Thêm khối vào trang chủ')));
    }
    const enabled = field(sec, 'enabled', { type: 'switch', label: 'Hiện trên trang chủ', onChange: () => setTimeout(renderMain, 0) });
    return h('div', {},
      pageHead(info.label, info.desc, enabled),
      h('div', { class: `panel stack${sec.enabled ? '' : ' is-off'}` }, sectionEditor(sec)),
      h('div', { class: 'panel stack' }, h('h3', {}, 'Menu'),
        h('div', { class: 'grid-2' },
          field(sec, 'navLabel', { label: 'Tên trên menu', placeholder: 'Để trống = không hiện trên menu' }),
          field(sec, 'id', { label: 'ID khối (dùng cho link #id)', hint: 'Chỉ chữ, số, dấu - và _', onChange: (v) => {
            sec.id = v.replace(/[^\w-]/g, '').slice(0, 40) || uid(sec.type + '-');
          } })),
        h('p', { class: 'dim', style: { margin: 0 } }, 'Đổi thứ tự các khối ở tab ', h('a', { href: '#', onclick: (e) => { e.preventDefault(); switchTab('layout'); } }, 'Bố cục & menu'), '.')));
  }

  function sectionCard(sec, i) {
    const open = state.openSection === sec.id;
    const info = SECTION_INFO[sec.type];
    const enabled = field(sec, 'enabled', { type: 'switch', onChange: () => setTimeout(renderMain, 0) });
    enabled.addEventListener('click', (e) => e.stopPropagation());

    const head = h('div', { class: 'card__head', onclick: (e) => {
      if (e.target.closest('.handle, button, .switch')) return;
      state.openSection = open ? null : sec.id;
      renderMain();
      if (!open) scrollPreviewTo(sec.id);
    } },
      gripHandle(),
      h('div', { class: 'section-title' },
        h('strong', {}, sectionTitle(sec)),
        h('small', {}, `${info.label} · #${sec.id}${sec.navLabel ? ' · có trên menu' : ''}`)),
      enabled,
      h('span', { class: 'chev' }, icon('chevron')));

    return h('div', { class: `card section-item${open ? ' is-open' : ''}${sec.enabled ? '' : ' is-off'}`, 'data-index': i, 'data-sid': sec.id },
      head,
      open ? h('div', { class: 'card__body stack' }, sectionEditor(sec),
        h('div', { class: 'grid-2' },
          field(sec, 'navLabel', { label: 'Tên trên menu', placeholder: 'Để trống = không hiện trên menu' }),
          field(sec, 'id', { label: 'ID khối (dùng cho link #id)', hint: 'Chỉ chữ, số, dấu - và _', onChange: (v) => {
            sec.id = v.replace(/[^\w-]/g, '').slice(0, 40) || uid(sec.type + '-');
            state.openSection = sec.id;
          } })),
        h('div', { class: 'row' },
          h('button', { class: 'btn btn--sm', onclick: () => {
            const copy = clone(sec);
            copy.id = uid(sec.type + '-');
            copy.navLabel = '';
            state.content.sections.splice(i + 1, 0, copy);
            state.openSection = copy.id;
            changed({ rerender: true });
          } }, icon('copy'), 'Nhân bản'),
          h('span', { class: 'spacer' }),
          h('button', { class: 'btn btn--sm btn--danger', onclick: async () => {
            if (!(await confirmBox(`Xoá khối "${sectionTitle(sec)}"? (Có thể tắt thay vì xoá)`, { ok: 'Xoá khối', danger: true }))) return;
            state.content.sections.splice(i, 1);
            changed({ rerender: true });
          } }, icon('trash'), 'Xoá khối'))) : null);
  }

  function sectionTitle(sec) {
    return sec.data.title || SECTION_INFO[sec.type].label;
  }

  function sectionEditor(sec) {
    const d = sec.data;
    switch (sec.type) {
      case 'showreel':
        return h('div', { class: 'stack' },
          h('div', { class: 'grid-2' },
            field(d, 'title', { label: 'Tiêu đề lớn', placeholder: 'SHOWREEL 2026' }),
            field(d, 'subtitle', { label: 'Dòng phụ', placeholder: 'Crafting cinematic stories' })),
          videoUrlField(d, 'videoUrl', { label: 'Video showreel (nút ▶)', hint: 'Video tải lên (.mp4) sẽ tự chạy nền không tiếng; link YouTube/Vimeo phát khi bấm ▶. Để trống để ẩn nút.' }),
          imageField(d, 'image', { label: 'Ảnh nền', hint: 'Ảnh ngang, tối thiểu 1600px. Nên chọn ảnh tối để chữ nổi bật.', ratio: '16 / 7.2' }));

      case 'profile':
        return h('div', { class: 'stack' },
          imageField(d, 'image', { label: 'Ảnh chân dung', hint: 'Ảnh dọc hoặc vuông. Để trống để ẩn.', ratio: '4 / 5', maxWidth: '240px' }),
          field(d, 'title', { label: 'Tiêu đề', placeholder: 'Ví dụ: Xin chào, mình là Thanh Hải' }),
          field(d, 'text', { type: 'textarea', label: 'Giới thiệu', rows: 4 }),
          h('div', { class: 'grid-2' },
            field(d, 'buttonText', { label: 'Chữ trên nút', placeholder: 'Để trống để ẩn nút' }),
            field(d, 'buttonLink', { label: 'Link nút', hint: linkHint() })),
          field(d, 'showContact', { type: 'switch', label: 'Hiện số điện thoại & email (sửa ở tab Cài đặt)' }),
          field(d, 'showSocials', { type: 'switch', label: 'Hiện biểu tượng mạng xã hội' }),
          h('div', { class: 'field' }, h('span', {}, 'Chỉ số (tối đa 4)'),
            listEditor(d.stats, {
              title: (it) => [it.value, it.label].filter(Boolean).join(' ') || 'Chỉ số',
              create: () => ({ value: '', label: '' }),
              addLabel: 'Thêm chỉ số',
              max: 4,
              render: (it) => h('div', { class: 'grid-2' },
                field(it, 'value', { label: 'Số', placeholder: '120+' }),
                field(it, 'label', { label: 'Mô tả', placeholder: 'Dự án hoàn thiện' })),
            })));

      case 'portfolio':
        return h('div', { class: 'stack' },
          field(d, 'title', { label: 'Tiêu đề', placeholder: 'Để trống để ẩn' }),
          h('div', { class: 'grid-3' },
            field(d, 'columns', { type: 'select', number: true, label: 'Số cột', options: [[1, '1 cột'], [2, '2 cột'], [3, '3 cột'], [4, '4 cột']] }),
            field(d, 'aspect', { type: 'select', label: 'Tỉ lệ ảnh', options: [['16:10', '16:10'], ['16:9', '16:9 (ngang)'], ['4:3', '4:3'], ['1:1', '1:1 (vuông)'], ['9:16', '9:16 (dọc)']] }),
            field(d, 'limit', { type: 'number', label: 'Số dự án tối đa', min: 0, max: 200, hint: '0 = hiện tất cả' })),
          field(d, 'category', { type: 'select', label: 'Chỉ hiện danh mục', options: [['', 'Tất cả danh mục'], ...categories()] }),
          field(d, 'showFilter', { type: 'switch', label: 'Hiện nút lọc theo danh mục' }),
          h('p', { class: 'dim', style: { margin: 0 } }, 'Dự án được quản lý ở tab ', h('a', { href: '#', onclick: (e) => { e.preventDefault(); switchTab('videos'); } }, 'Dự án'), '.'));

      case 'bts':
        return h('div', { class: 'stack' },
          h('div', { class: 'grid-2' },
            field(d, 'title', { label: 'Tiêu đề', placeholder: 'Behind the scenes' }),
            field(d, 'subtitle', { label: 'Tiêu đề phụ', placeholder: 'Hậu trường kỹ thuật' })),
          h('div', { class: 'field' }, h('span', {}, 'Timeline & chỉnh màu'),
            h('div', { class: 'sub-item stack' },
              imageField(d, 'timelineImage', { label: 'Ảnh chụp timeline dựng phim', hint: 'Chụp màn hình timeline Premiere/Resolve.', ratio: '16 / 10', maxWidth: '420px' }),
              h('div', { class: 'grid-2' },
                imageField(d, 'beforeImage', { label: 'Ảnh trước khi chỉnh màu', ratio: '16 / 10' }),
                imageField(d, 'afterImage', { label: 'Ảnh sau khi chỉnh màu', ratio: '16 / 10' }),
                field(d, 'beforeLabel', { label: 'Nhãn ảnh trước', placeholder: 'LOG' }),
                field(d, 'afterLabel', { label: 'Nhãn ảnh sau', placeholder: 'Color grade' })),
              h('small', { class: 'dim' }, 'Cần cả 2 ảnh (cùng khung hình) thì thanh kéo so sánh mới hiện.'))),
          h('div', { class: 'field' }, h('span', {}, 'Đa định dạng (ngang & dọc)'),
            h('small', {}, 'Ảnh các phiên bản 16:9, 9:16, 1:1… Chọn đúng tỉ lệ khung của từng ảnh.'),
            listEditor(d.formats, {
              title: (it, j) => it.label || `Định dạng ${j + 1}`,
              create: () => ({ image: '', label: '', aspect: '16:9' }),
              addLabel: 'Thêm định dạng',
              max: 8,
              render: (it) => h('div', { class: 'stack' },
                h('div', { class: 'grid-2' },
                  field(it, 'label', { label: 'Nhãn', placeholder: 'Ví dụ: Bản 9:16 (TikTok/Reels)' }),
                  field(it, 'aspect', { type: 'select', label: 'Tỉ lệ khung', options: ASPECT_OPTIONS, rerender: true })),
                imageField(it, 'image', { label: 'Ảnh', ratio: it.aspect.replace(':', ' / '), maxWidth: it.aspect === '9:16' || it.aspect === '4:5' ? '200px' : '360px' })),
            })),
          h('div', { class: 'field' }, h('span', {}, 'Ảnh hậu trường & breakdown'),
            h('small', {}, 'Ảnh on-set, BTS, VFX/sound breakdown… Các ảnh liền nhau cùng nhóm sẽ có chung một tiêu đề.'),
            h('datalist', { id: 'bts-groups' }, ['Cảnh quay on-set & BTS', 'VFX & sound breakdown', ...new Set(d.bts.map((b) => b.group).filter(Boolean))].map((g) => h('option', { value: g }))),
            listEditor(d.bts, {
              title: (it, j) => it.caption || `Ảnh ${j + 1}`,
              create: () => ({ group: (d.bts[d.bts.length - 1] || {}).group || 'Cảnh quay on-set & BTS', image: '', caption: '' }),
              addLabel: 'Thêm ảnh',
              max: 12,
              render: (it) => h('div', { class: 'stack' },
                h('div', { class: 'grid-2' },
                  field(it, 'group', { label: 'Nhóm', list: 'bts-groups' }),
                  field(it, 'caption', { label: 'Chú thích' })),
                imageField(it, 'image', { label: 'Ảnh', ratio: '16 / 10', maxWidth: '360px' })),
            })));

      case 'contact':
        return h('div', { class: 'stack' },
          field(d, 'title', { label: 'Tiêu đề' }),
          field(d, 'text', { type: 'textarea', label: 'Nội dung', rows: 2 }),
          field(d, 'showForm', { type: 'switch', label: 'Hiện form gửi tin nhắn (tin nhắn xem ở tab Tin nhắn)' }),
          field(d, 'buttonText', { label: 'Chữ trên nút gửi', placeholder: 'Gửi tin nhắn' }),
          h('p', { class: 'dim', style: { margin: 0 } }, 'Địa chỉ, email, số điện thoại, mạng xã hội sửa ở tab ', h('a', { href: '#', onclick: (e) => { e.preventDefault(); switchTab('settings'); } }, 'Cài đặt'), '.'));
    }
    return h('div');
  }

  /* ================= Tab: Thông tin & giao diện ================= */

  function viewSettings() {
    const s = state.content.settings;
    return h('div', {},
      pageHead('Thông tin & giao diện', 'Logo, màu sắc, font chữ, thông tin liên hệ và SEO.'),
      h('div', { class: 'panel stack' }, h('h3', {}, 'Thương hiệu'),
        field(s, 'siteName', { label: 'Tên trang web' }),
        h('div', { class: 'grid-2' },
          field(s, 'logoText', { label: 'Logo — chữ chính' }),
          field(s, 'logoSub', { label: 'Logo — chữ phụ' })),
        imageField(s, 'logoImage', { label: 'Logo dạng ảnh (thay cho biểu tượng)', hint: 'PNG nền trong suốt, cao khoảng 80px.' }),
        imageField(s, 'favicon', { label: 'Favicon (icon trên tab trình duyệt)', hint: 'Ảnh vuông 64×64 hoặc .ico' })),
      h('div', { class: 'panel stack' }, h('h3', {}, 'Giao diện sáng / tối'),
        field(s, 'theme', { type: 'select', label: 'Giao diện mặc định', options: [['dark', 'Tối'], ['light', 'Sáng'], ['auto', 'Tự động theo thiết bị của người xem']] }),
        field(s, 'themeToggle', { type: 'switch', label: 'Hiện nút ☀/☾ trên menu để người xem tự đổi sáng/tối' }),
        h('div', { class: 'grid-2' },
          field(s, 'backgroundColor', { type: 'color', label: 'Màu nền giao diện tối' }),
          field(s, 'lightBackgroundColor', { type: 'color', label: 'Màu nền giao diện sáng' }))),
      h('div', { class: 'panel stack' }, h('h3', {}, 'Màu nhấn & font chữ'),
        h('div', { class: 'grid-2' },
          field(s, 'accentColor', { type: 'color', label: 'Màu nhấn (nút, chỉ số, bộ lọc…)' }),
          field(s, 'headingFont', { type: 'select', label: 'Font tiêu đề', options: state.meta.fonts }))),
      h('div', { class: 'panel stack' }, h('h3', {}, 'Nút trên menu'),
        h('div', { class: 'grid-2' },
          field(s, 'contactButtonText', { label: 'Chữ trên nút', placeholder: 'Để trống để ẩn' }),
          field(s, 'contactButtonLink', { label: 'Link', hint: 'Ví dụ #contact, https://zalo.me/…, tel:0900…' }))),
      h('div', { class: 'panel stack' }, h('h3', {}, 'Thông tin liên hệ'),
        h('p', { class: 'dim', style: { margin: '-8px 0 0' } }, 'Hiện ở khối Giới thiệu và khối Liên hệ.'),
        h('div', { class: 'grid-3' },
          field(s, 'email', { label: 'Email', type: 'email' }),
          field(s, 'phone', { label: 'Số điện thoại' }),
          field(s, 'address', { label: 'Địa chỉ' }))),
      h('div', { class: 'panel stack' }, h('h3', {}, 'Mạng xã hội'),
        h('p', { class: 'dim', style: { margin: '-8px 0 0' } }, 'Để trống mục nào thì ẩn biểu tượng đó.'),
        h('div', { class: 'grid-2' },
          field(s.socials, 'facebook', { label: 'Facebook' }),
          field(s.socials, 'youtube', { label: 'YouTube' }),
          field(s.socials, 'instagram', { label: 'Instagram' }),
          field(s.socials, 'tiktok', { label: 'TikTok' }),
          field(s.socials, 'behance', { label: 'Behance' }),
          field(s.socials, 'linkedin', { label: 'LinkedIn' }),
          field(s.socials, 'x', { label: 'X (Twitter)' }),
          field(s.socials, 'zalo', { label: 'Zalo', placeholder: 'https://zalo.me/0900000000' }))),
      h('div', { class: 'panel stack' }, h('h3', {}, 'SEO & chia sẻ'),
        field(s, 'metaTitle', { label: 'Tiêu đề trang (hiện trên Google & tab trình duyệt)' }),
        field(s, 'metaDescription', { type: 'textarea', label: 'Mô tả', rows: 2, hint: 'Khoảng 150 ký tự.' }),
        imageField(s, 'ogImage', { label: 'Ảnh khi chia sẻ link (Facebook, Zalo…)', hint: 'Kích thước 1200×630.' })),
      h('div', { class: 'panel stack' }, h('h3', {}, 'Chân trang'),
        field(s, 'footerText', { label: 'Dòng bản quyền', hint: '{year} sẽ tự đổi thành năm hiện tại.' })));
  }

  /* ================= Tab: Thư viện file ================= */

  function viewFiles() {
    const wrap = h('div', { class: 'files' }, h('p', { class: 'muted' }, 'Đang tải…'));
    const used = JSON.stringify(state.content);

    async function load() {
      try {
        const files = await listUploads();
        wrap.replaceChildren(...(files.length ? files.map((f) => {
          const vid = isVideoFile(f.name);
          return h('div', { class: 'file' },
            h('div', { class: 'file__img', style: vid ? {} : { backgroundImage: `url("${f.url}")` } },
              vid ? h('video', { src: f.url, muted: true, preload: 'metadata' }) : null),
            h('div', { class: 'file__meta' },
              h('span', { title: f.name }, `${vid ? 'Video · ' : ''}${fmtSize(f.size)}${used.includes(f.url) ? ' · đang dùng' : ''}`),
              h('button', { class: 'btn btn--ghost btn--icon', title: 'Copy link', 'aria-label': 'Copy link', onclick: async () => {
                try { await navigator.clipboard.writeText(f.url); toast('Đã copy link'); } catch { prompt('Link file:', f.url); }
              } }, icon('copy')),
              h('button', { class: 'btn btn--ghost btn--icon btn--danger', title: 'Xoá', 'aria-label': 'Xoá', onclick: async () => {
                const warn = used.includes(f.url) ? ' File này đang được dùng trên trang!' : '';
                if (!(await confirmBox(`Xoá vĩnh viễn file này?${warn}`, { ok: 'Xoá', danger: true }))) return;
                try { must(await bucket().remove([f.path])); toast('Đã xoá'); load(); } catch (err) { toast(err.message, 'err'); }
              } }, icon('trash'))));
        }) : [h('p', { class: 'muted' }, 'Chưa có file nào.')]));
      } catch (err) {
        wrap.replaceChildren(h('p', { class: 'error' }, err.message));
      }
    }

    async function doUpload(fileList) {
      for (const f of fileList) {
        try { await uploadFile(f); toast(`Đã tải lên ${f.name}`); } catch (err) { toast(`${f.name}: ${err.message}`, 'err'); }
      }
      load();
    }

    const zone = h('div', { class: 'quick-add drop-zone', style: { alignItems: 'center' } },
      icon('upload'), h('span', { class: 'muted', style: { flex: 1 } }, `Kéo thả ảnh/video vào đây hoặc bấm nút. Tối đa ${MAX_FILE_MB}MB mỗi file. Video tải lên có thể dùng link của nó làm link video portfolio.`),
      h('button', { class: 'btn btn--primary', onclick: () => {
        const inp = h('input', { type: 'file', multiple: true, accept: 'image/*,video/mp4,video/webm,video/quicktime' });
        inp.onchange = () => doUpload([...inp.files]);
        inp.click();
      } }, 'Chọn file'));
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('is-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('is-over'));
    zone.addEventListener('drop', (e) => { e.preventDefault(); zone.classList.remove('is-over'); doUpload([...e.dataTransfer.files]); });

    load();
    return h('div', {},
      pageHead('Thư viện file', 'Ảnh và video lưu trên Supabase Storage, hiển thị trên web ngay sau khi tải lên.'),
      zone, wrap);
  }

  /* ================= Tab: Tin nhắn ================= */

  // Đếm tin nhắn chưa đọc (hiện trên tab)
  async function loadUnread() {
    try {
      const { count, error } = await sb.from('contact_messages').select('id', { count: 'exact', head: true }).eq('is_read', false);
      if (error) return;
      state.unread = count || 0;
      updateDirty();
    } catch { /* bỏ qua */ }
  }

  function viewMessages() {
    const box = h('div', {}, h('p', { class: 'muted' }, 'Đang tải…'));

    async function load() {
      try {
        const rows = must(await sb.from('contact_messages').select('*').order('id', { ascending: false }).limit(200));
        state.unread = rows.filter((r) => !r.is_read).length;
        updateDirty();
        box.replaceChildren(rows.length
          ? h('div', { class: 'msg-list' }, rows.map(message))
          : h('div', { class: 'empty-state' }, 'Chưa có tin nhắn nào. Tin nhắn khách gửi từ form liên hệ trên web sẽ hiện ở đây.'));
      } catch (err) {
        box.replaceChildren(h('p', { class: 'error' }, err.message));
      }
    }

    async function update(r, patch) {
      try {
        must(await sb.from('contact_messages').update(patch).eq('id', r.id));
        load();
      } catch (err) { toast(err.message, 'err'); }
    }

    function message(r) {
      const subject = `Re: Liên hệ từ website${r.project ? ` — ${r.project}` : ''}`;
      return h('div', { class: `msg${r.is_read ? '' : ' is-new'}` },
        h('div', { class: 'msg__head' },
          h('strong', {}, r.name),
          h('a', { href: `mailto:${r.email}` }, r.email),
          r.project ? h('span', { class: 'badge' }, r.project) : null,
          h('span', { class: 'spacer' }),
          h('span', { class: 'dim' }, new Date(r.created_at).toLocaleString('vi-VN'))),
        h('p', { class: 'msg__body' }, r.message),
        h('div', { class: 'row row--wrap' },
          h('a', { class: 'btn btn--sm', href: `mailto:${r.email}?subject=${encodeURIComponent(subject)}`, onclick: () => !r.is_read && update(r, { is_read: true }) }, icon('reply'), 'Trả lời qua email'),
          h('button', { class: 'btn btn--sm btn--ghost', onclick: () => update(r, { is_read: !r.is_read }) }, icon('check'), r.is_read ? 'Đánh dấu chưa đọc' : 'Đánh dấu đã đọc'),
          h('span', { class: 'spacer' }),
          h('button', { class: 'btn btn--sm btn--ghost btn--danger', onclick: async () => {
            if (!(await confirmBox(`Xoá tin nhắn của ${r.name}?`, { ok: 'Xoá', danger: true }))) return;
            try { must(await sb.from('contact_messages').delete().eq('id', r.id)); toast('Đã xoá'); load(); } catch (err) { toast(err.message, 'err'); }
          } }, icon('trash'), 'Xoá')));
    }

    load();
    return h('div', {},
      pageHead('Tin nhắn liên hệ', 'Tin nhắn khách gửi từ form "Liên hệ & hợp tác" trên trang web.',
        h('button', { class: 'btn', onclick: load }, 'Tải lại')),
      box);
  }

  /* ================= Tab: Tài khoản ================= */

  function viewAccount() {
    const p1 = h('input', { type: 'password', autocomplete: 'new-password', minlength: 6 });
    const p2 = h('input', { type: 'password', autocomplete: 'new-password', minlength: 6 });
    return h('div', {},
      pageHead('Tài khoản', `Đang đăng nhập: ${state.user.username}`),
      h('form', { class: 'panel stack', onsubmit: async (e) => {
        e.preventDefault();
        if (p1.value.length < 6) return toast('Mật khẩu tối thiểu 6 ký tự', 'err');
        if (p1.value !== p2.value) return toast('Mật khẩu nhập lại không khớp', 'err');
        try {
          must(await sb.auth.updateUser({ password: p1.value }));
          p1.value = p2.value = '';
          toast('Đã đổi mật khẩu');
        } catch (err) { toast(err.message, 'err'); }
      } },
        h('h3', {}, 'Đổi mật khẩu'),
        h('div', { class: 'grid-2' },
          h('label', { class: 'field' }, h('span', {}, 'Mật khẩu mới'), p1),
          h('label', { class: 'field' }, h('span', {}, 'Nhập lại'), p2)),
        h('div', {}, h('button', { class: 'btn btn--primary', type: 'submit' }, 'Đổi mật khẩu'))),
      h('div', { class: 'panel stack' }, h('h3', {}, 'Đăng xuất'),
        h('p', { class: 'dim', style: { margin: 0 } }, 'Nếu dùng máy chung, hãy đăng xuất sau khi dùng xong.'),
        h('div', {}, h('button', { class: 'btn btn--danger', onclick: logout }, icon('logout'), 'Đăng xuất'))));
  }

  /* ================= Tab: Sao lưu ================= */

  function viewBackup() {
    const listBox = h('div', {}, h('p', { class: 'muted' }, 'Đang tải…'));

    // Nạp một phiên bản vào trình soạn thảo (chưa lưu) để xem trước rồi bấm Lưu
    function loadVersion(data, label) {
      state.content = P.normalizeContent(data);
      renderApp();
      toast(`Đã nạp ${label} — xem trước rồi bấm "Lưu thay đổi" để áp dụng`);
    }

    sb.from('site_content_history').select('id, created_at, created_by').order('id', { ascending: false }).limit(50).then((res) => {
      const rows = must(res);
      listBox.replaceChildren(rows.length
        ? h('table', { class: 'table' }, h('tbody', {}, rows.map((r) => {
            const when = new Date(r.created_at).toLocaleString('vi-VN');
            return h('tr', {},
              h('td', {}, when),
              h('td', { class: 'dim' }, r.created_by || ''),
              h('td', { style: { textAlign: 'right' } },
                h('button', { class: 'btn btn--sm', onclick: async () => {
                  if (isDirty() && !(await confirmBox('Bạn đang có thay đổi chưa lưu, chúng sẽ bị thay thế. Tiếp tục?', { ok: 'Tiếp tục', danger: true }))) return;
                  try {
                    const row = must(await sb.from('site_content_history').select('content').eq('id', r.id).single());
                    loadVersion(row.content, `phiên bản ${when}`);
                  } catch (err) { toast(err.message, 'err'); }
                } }, 'Khôi phục')));
          })))
        : h('p', { class: 'muted' }, 'Chưa có lịch sử. Mỗi lần bấm Lưu, phiên bản trước sẽ được giữ lại ở đây (tối đa 50 bản).'));
    }).catch((err) => listBox.replaceChildren(h('p', { class: 'error' }, err.message)));

    return h('div', {},
      pageHead('Sao lưu & khôi phục', 'Mỗi lần Lưu, phiên bản trước được giữ lại tự động (50 bản gần nhất).'),
      h('div', { class: 'panel stack' }, h('h3', {}, 'Xuất / nhập dữ liệu'),
        h('p', { class: 'dim', style: { margin: 0 } }, 'Tải file JSON chứa toàn bộ nội dung để cất giữ, hoặc nạp lại từ file đã tải.'),
        h('div', { class: 'row row--wrap' },
          h('button', { class: 'btn', onclick: () => {
            const blob = new Blob([JSON.stringify(state.content, null, 2)], { type: 'application/json' });
            const a = h('a', { href: URL.createObjectURL(blob), download: `portfolio-backup-${new Date().toISOString().slice(0, 10)}.json` });
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
          } }, icon('download'), 'Tải file sao lưu'),
          h('button', { class: 'btn', onclick: async () => {
            const f = await pickFile('application/json,.json');
            if (!f) return;
            let data;
            try { data = JSON.parse(await f.text()); } catch { return toast('File không phải JSON hợp lệ', 'err'); }
            if (!data || !Array.isArray(data.sections)) return toast('File không đúng định dạng', 'err');
            loadVersion(data, 'dữ liệu từ file');
          } }, icon('upload'), 'Nạp từ file'))),
      h('div', { class: 'panel' }, h('h3', {}, 'Lịch sử thay đổi'), listBox));
  }

  /* ================= Khởi động ================= */

  async function boot() {
    state.meta = { fonts: P.FONTS };
    setContent(await loadContent());
    render();
    loadUnread();
  }

  function render() {
    if (!state.user) return renderLogin();
    if (!state.content) return boot().catch((err) => renderLogin(err.message));
    renderApp();
  }

  sb.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT' && state.user) {
      state.user = null;
      state.content = null;
      renderLogin('Phiên đăng nhập đã kết thúc');
    }
  });

  sb.auth.getSession().then(async ({ data: { session } }) => {
    if (!session) return renderLogin();
    try {
      await signIn();
      await boot();
    } catch (err) {
      renderLogin(err.message);
    }
  });
})();
