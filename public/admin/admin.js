/* Trang quản trị portfolio — JavaScript thuần, lưu nội dung bằng GitHub API.
 * Mỗi lần bấm Lưu = 1 commit vào repo -> GitHub Actions build lại trang (khoảng 1 phút). */
(() => {
  const $app = document.getElementById('app');
  const CFG = window.PORTFOLIO_CONFIG;
  const P = window.Portfolio; // renderPage, normalizeContent, FONTS, ICONS, icon (từ portfolio.bundle.js)
  const SITE = new URL('../', location.href).href; // gốc trang web (admin nằm ở /admin/)
  const state = {
    user: null,
    meta: null,
    content: null,
    savedJson: '',
    sha: null, // sha của content.json trên GitHub, dùng để phát hiện xung đột khi lưu
    localFiles: new Map(), // 'uploads/x.jpg' -> blob URL (ảnh vừa tải lên, chưa deploy xong)
    tab: 'videos',
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
  };
  const icon = (name) => {
    const span = document.createElement('span');
    span.style.display = 'contents';
    span.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
    return span.firstChild;
  };

  /* ---- Mã truy cập (GitHub token) lưu trên máy ---- */
  const TOKEN_KEY = 'portfolio_token';
  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
  }
  function setToken(token, remember) {
    try {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      if (token) (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
    } catch { /* bỏ qua */ }
  }

  /* ---- GitHub API ---- */
  const REPO = `/repos/${CFG.owner}/${CFG.repo}`;
  const encPath = (p) => p.split('/').map(encodeURIComponent).join('/');

  function ghError(status, data) {
    const msg = (data && data.message) || '';
    if (status === 401) return 'Mã truy cập không hợp lệ hoặc đã hết hạn';
    if (status === 403 && /rate limit/i.test(msg)) return 'GitHub đang giới hạn số lần gọi, thử lại sau ít phút';
    if (status === 403) return 'Mã truy cập không có quyền ghi vào repo (cần quyền Contents: Read and write)';
    if (status === 404) return 'Không tìm thấy repo hoặc mã truy cập không có quyền truy cập repo';
    if (status === 409 || (status === 422 && /sha/i.test(msg))) return 'Nội dung vừa được thay đổi ở nơi khác';
    return msg || `Lỗi GitHub ${status}`;
  }

  async function gh(path, opts = {}) {
    const token = opts.token || getToken();
    const res = await fetch('https://api.github.com' + path, {
      method: opts.method || 'GET',
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      cache: 'no-store',
    });
    const data = res.status === 204 ? null : await res.json().catch(() => null);
    if (!res.ok) {
      const err = new Error(ghError(res.status, data));
      err.status = res.status;
      if (res.status === 401 && !opts.token) {
        setToken(null);
        state.user = null;
        render();
      }
      throw err;
    }
    return data;
  }

  // base64 <-> UTF-8 / bytes
  function bytesToB64(bytes) {
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  const textToB64 = (text) => bytesToB64(new TextEncoder().encode(text));
  const b64ToText = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), (c) => c.charCodeAt(0)));

  const getFile = (path, ref = CFG.branch) => gh(`${REPO}/contents/${encPath(path)}?ref=${encodeURIComponent(ref)}`);
  const putFile = (path, contentB64, message, sha) =>
    gh(`${REPO}/contents/${encPath(path)}`, { method: 'PUT', body: { message, content: contentB64, branch: CFG.branch, ...(sha ? { sha } : {}) } });
  const deleteFile = (path, sha, message) =>
    gh(`${REPO}/contents/${encPath(path)}`, { method: 'DELETE', body: { message, sha, branch: CFG.branch } });
  async function listDir(path) {
    try {
      const items = await gh(`${REPO}/contents/${encPath(path)}?ref=${encodeURIComponent(CFG.branch)}`);
      return Array.isArray(items) ? items.filter((f) => f.type === 'file' && !f.name.startsWith('.')) : [];
    } catch (err) {
      if (err.status === 404) return [];
      throw err;
    }
  }

  async function loadContent() {
    const file = await getFile(CFG.contentPath);
    state.sha = file.sha;
    return P.normalizeContent(JSON.parse(b64ToText(file.content)));
  }

  // Đường dẫn ảnh dùng trong trang admin (ảnh 'uploads/...' nằm ở gốc web)
  function assetUrl(u) {
    if (!u) return '';
    if (state.localFiles.has(u)) return state.localFiles.get(u);
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
    });
  }

  async function save() {
    if (!isDirty() || state.saving) return;
    state.saving = true;
    updateDirty();
    try {
      const next = P.normalizeContent(state.content);
      const json = JSON.stringify(next, null, 2) + '\n';
      let r;
      try {
        r = await putFile(CFG.contentPath, textToB64(json), `Cập nhật nội dung từ trang quản trị (${state.user.username})`, state.sha);
      } catch (err) {
        if (err.status !== 409 && err.status !== 422) throw err;
        // Có người khác vừa lưu: hỏi có ghi đè không
        const ok = await confirmBox('Nội dung trên GitHub vừa được thay đổi ở nơi khác (máy khác hoặc tab khác). Ghi đè bằng nội dung bạn đang sửa?', { ok: 'Ghi đè', danger: true });
        if (!ok) return;
        state.sha = (await getFile(CFG.contentPath)).sha;
        r = await putFile(CFG.contentPath, textToB64(json), `Cập nhật nội dung từ trang quản trị (${state.user.username})`, state.sha);
      }
      state.sha = r.content.sha;
      setContent(next);
      renderMain();
      toast('Đã lưu — trang web sẽ cập nhật sau khoảng 1 phút');
      watchDeploy(r.commit.sha);
    } catch (err) {
      toast(err.message, 'err');
    } finally {
      state.saving = false;
      updateDirty();
    }
  }

  // Hiện trạng thái GitHub Actions build & đăng trang sau khi lưu
  let deployTimer = null;
  function setDeployChip(text, kind) {
    const chip = document.querySelector('.deploy');
    if (!chip) return;
    chip.className = `deploy deploy--${kind}`;
    chip.textContent = text;
    chip.classList.toggle('hidden', !text);
  }
  function watchDeploy(commitSha) {
    clearTimeout(deployTimer);
    setDeployChip('Đang cập nhật web…', 'busy');
    const started = Date.now();
    const tick = async () => {
      try {
        const r = await gh(`${REPO}/actions/runs?head_sha=${commitSha}&per_page=5`);
        const run = (r.workflow_runs || [])[0];
        if (run && run.status === 'completed') {
          if (run.conclusion === 'success') {
            setDeployChip('Web đã cập nhật ✓', 'ok');
            deployTimer = setTimeout(() => setDeployChip('', 'ok'), 8000);
          } else if (run.conclusion !== 'cancelled') {
            setDeployChip('Cập nhật web lỗi', 'err');
          }
          return;
        }
      } catch (err) {
        // Mã truy cập không có quyền đọc Actions: chỉ báo thời gian ước tính
        if (err.status === 403 || err.status === 404) {
          setDeployChip('Web sẽ cập nhật sau ~1 phút', 'busy');
          deployTimer = setTimeout(() => setDeployChip('', 'ok'), 60000);
          return;
        }
      }
      if (Date.now() - started < 5 * 60e3) deployTimer = setTimeout(tick, 5000);
      else setDeployChip('', 'ok');
    };
    deployTimer = setTimeout(tick, 4000);
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
      let html = P.renderPage(P.normalizeContent(state.content), { preview: true, base: SITE, version: 'preview' });
      // Ảnh vừa tải lên chưa có trên web -> dùng bản trong máy
      state.localFiles.forEach((blob, url) => { html = html.split(`"${url}"`).join(`"${blob}"`); });
      if (seq !== previewSeq) return;
      let scroll = 0;
      try { scroll = frame.contentWindow.scrollY; } catch { /* bỏ qua */ }
      frame.onload = () => {
        try {
          frame.contentDocument.documentElement.style.scrollBehavior = 'auto';
          frame.contentWindow.scrollTo(0, scroll);
          // Không cho link trong bản xem trước điều hướng khỏi trang
          frame.contentDocument.addEventListener('click', (e) => {
            const a = e.target.closest('a');
            if (!a) return;
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

  const IMAGE_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif', 'image/x-icon': 'ico', 'image/vnd.microsoft.icon': 'ico' };
  const MAX_IMAGE_MB = 10;

  // Tải ảnh lên repo (content/uploads/...), trả về đường dẫn 'uploads/<tên>'
  async function uploadFile(file) {
    const ext = IMAGE_EXT[file.type];
    if (!ext) throw new Error('Chỉ hỗ trợ ảnh JPG, PNG, WEBP, GIF, AVIF, ICO. Video hãy đưa lên YouTube/Drive rồi dán link.');
    if (file.size > MAX_IMAGE_MB * 1048576) throw new Error(`Ảnh tối đa ${MAX_IMAGE_MB}MB — hãy nén ảnh trước (ví dụ squoosh.app)`);
    const name = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const t = h('div', { class: 'toast' }, `Đang tải lên ${file.name}…`);
    document.getElementById('toasts').append(t);
    try {
      const b64 = bytesToB64(new Uint8Array(await file.arrayBuffer()));
      await putFile(`${CFG.uploadsPath}/${name}`, b64, `Tải ảnh lên: ${file.name}`);
      const url = `uploads/${name}`;
      state.localFiles.set(url, URL.createObjectURL(file));
      return url;
    } finally {
      t.remove();
    }
  }

  async function listUploads() {
    const files = await listDir(CFG.uploadsPath);
    return files
      .map((f) => ({ name: f.name, path: f.path, sha: f.sha, size: f.size, url: `uploads/${f.name}` }))
      .sort((a, b) => b.name.localeCompare(a.name)); // tên bắt đầu bằng thời gian -> mới nhất lên đầu
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
  function imageField(obj, key, o = {}) {
    const preview = h('div', { class: 'img-field__preview' });
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
      h('div', { class: 'img-field' }, preview,
        h('div', { class: 'img-field__side' }, input,
          h('div', { class: 'row row--wrap' },
            h('button', { type: 'button', class: 'btn btn--sm', onclick: async () => {
              const f = await pickFile('image/*');
              if (!f) return;
              try { set(await uploadFile(f)); } catch (err) { toast(err.message, 'err'); }
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

  function renderLogin(message) {
    const err = h('p', { class: 'error' }, message || '');
    const tokenInput = h('input', { name: 'token', type: 'password', autocomplete: 'off', spellcheck: 'false', required: true, placeholder: 'github_pat_…' });
    const remember = h('input', { type: 'checkbox', checked: true });
    const btn = h('button', { class: 'btn btn--primary', type: 'submit' }, 'Đăng nhập');
    $app.replaceChildren(h('div', { class: 'login' },
      h('form', { onsubmit: async (e) => {
        e.preventDefault();
        err.textContent = '';
        btn.disabled = true;
        try {
          const token = tokenInput.value.trim();
          await signIn(token);
          setToken(token, remember.checked);
          await boot();
        } catch (ex) {
          err.textContent = ex.message;
        } finally {
          btn.disabled = false;
        }
      } },
        h('div', { class: 'brand' }, h('span', { class: 'brand__mark' }, icon('film')), 'Quản trị Portfolio'),
        h('h1', {}, 'Đăng nhập'),
        h('p', {}, 'Nhập mã truy cập được cấp để quản lý video, bố cục và thông tin trang web.'),
        h('label', { class: 'field' }, h('span', {}, 'Mã truy cập'), tokenInput),
        h('label', { class: 'switch' }, remember, h('i'), 'Ghi nhớ trên máy này'),
        err, btn,
        h('details', { class: 'login__help' },
          h('summary', {}, 'Chưa có mã truy cập?'),
          h('p', {}, 'Liên hệ người quản lý website để được cấp mã. Người quản lý tạo mã tại GitHub → Settings → Developer settings → Fine-grained tokens, chỉ chọn repo ',
            h('b', {}, `${CFG.owner}/${CFG.repo}`), ', quyền ', h('b', {}, 'Contents: Read and write'), ' (thêm ', h('b', {}, 'Actions: Read'), ' để xem trạng thái cập nhật web).')),
        h('a', { href: SITE, style: { fontSize: '13px', textAlign: 'center' } }, '← Về trang chủ'))));
    tokenInput.focus();
  }

  // Kiểm tra mã truy cập: phải ghi được vào repo
  async function signIn(token) {
    if (!/^(github_pat_|ghp_|gho_)[\w]+$/.test(token)) throw new Error('Mã truy cập không đúng định dạng (bắt đầu bằng github_pat_ hoặc ghp_)');
    const repo = await gh(REPO, { token });
    if (!repo.permissions || !repo.permissions.push) throw new Error('Mã truy cập chỉ có quyền đọc. Cần quyền Contents: Read and write.');
    let login = 'admin';
    try { login = (await gh('/user', { token })).login; } catch { /* token chỉ cấp cho repo vẫn dùng được */ }
    state.user = { username: login, role: repo.permissions.admin ? 'root' : 'admin' };
  }

  /* ================= Khung ứng dụng ================= */

  const TABS = [
    ['videos', 'Video', 'video', 'videos'],
    ['layout', 'Bố cục', 'layout', 'sections'],
    ['settings', 'Cài đặt', 'settings'],
    ['files', 'Thư viện file', 'image'],
    ['account', 'Tài khoản', 'user'],
    ['backup', 'Sao lưu', 'archive'],
  ];

  function renderApp() {
    const body = h('div', { class: `body${state.showPreview ? '' : ' no-preview'}` },
      h('nav', { class: 'sidebar' }, TABS.map(([id, label, ic, count]) =>
        h('button', { class: `tab${state.tab === id ? ' is-active' : ''}`, 'data-tab': id, onclick: () => switchTab(id) },
          icon(ic), label, count ? h('span', { class: 'count', 'data-count': count }) : null))),
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
    state.tab = id;
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('is-active', t.dataset.tab === id));
    renderMain();
    document.querySelector('.main').scrollTop = 0;
  }

  async function logout() {
    if (isDirty() && !(await confirmBox('Bạn có thay đổi chưa lưu. Vẫn đăng xuất?', { ok: 'Đăng xuất', danger: true }))) return;
    setToken(null);
    state.user = null;
    state.savedJson = JSON.stringify(state.content);
    render();
  }

  function renderMain() {
    const main = document.querySelector('.main');
    if (!main) return;
    const views = { videos: viewVideos, layout: viewLayout, settings: viewSettings, files: viewFiles, account: viewAccount, backup: viewBackup };
    main.replaceChildren(views[state.tab]());
    updateDirty();
  }

  const pageHead = (title, desc, ...actions) =>
    h('div', { class: 'page-head' }, h('div', { style: { flex: 1, minWidth: '220px' } }, h('h2', {}, title), desc ? h('p', {}, desc) : null), ...actions);

  /* ================= Tab: Video ================= */

  const PROVIDER_LABEL = { youtube: 'YouTube', vimeo: 'Vimeo', drive: 'Google Drive', tiktok: 'TikTok', facebook: 'Facebook', file: 'File video' };

  function thumbFor(v) {
    if (v.thumbnail) return assetUrl(v.thumbnail);
    const info = VideoUtils.parse(v.url);
    return (info && info.thumbnail) || '';
  }

  function categories() {
    return [...new Set(state.content.videos.map((v) => v.category).filter(Boolean))];
  }

  function viewVideos() {
    const videos = state.content.videos;
    const quick = h('input', { class: 'input', placeholder: 'Dán link YouTube, Vimeo, Google Drive, TikTok… rồi bấm Thêm' });
    const addFromQuick = () => {
      openVideoModal(null, quick.value.trim());
      quick.value = '';
    };
    quick.addEventListener('keydown', (e) => e.key === 'Enter' && addFromQuick());
    quick.addEventListener('paste', () => setTimeout(() => quick.value.trim() && addFromQuick(), 0));

    const list = h('div', { class: 'video-list' }, videos.map((v, i) => {
      const info = VideoUtils.parse(v.url);
      const th = thumbFor(v);
      return h('div', { class: `video-item${v.visible ? '' : ' is-off'}`, 'data-index': i },
        gripHandle(),
        h('div', { class: 'thumb', style: { backgroundImage: th ? `url("${th}")` : '' } }, th ? null : icon('film')),
        h('div', { class: 'video-item__info' },
          h('strong', {}, v.title || '(Chưa có tiêu đề)'),
          h('div', { class: 'row row--wrap' },
            info ? h('span', { class: `badge badge--${info.provider}` }, PROVIDER_LABEL[info.provider]) : h('span', { class: 'badge badge--bad' }, v.url ? 'Link không nhận diện' : 'Chưa có link'),
            v.category ? h('span', { class: 'badge' }, v.category) : null)),
        h('div', { class: 'item-actions' },
          field(v, 'visible', { type: 'switch', label: h('span', { class: 'dim' }, 'Hiện'), onChange: () => setTimeout(() => renderMain(), 0) }),
          h('button', { class: 'btn btn--ghost btn--icon', title: 'Sửa', 'aria-label': 'Sửa', onclick: () => openVideoModal(i) }, icon('edit')),
          h('button', { class: 'btn btn--ghost btn--icon btn--danger', title: 'Xoá', 'aria-label': 'Xoá', onclick: async () => {
            if (!(await confirmBox(`Xoá video "${v.title || 'không tên'}"?`, { ok: 'Xoá', danger: true }))) return;
            videos.splice(i, 1);
            changed({ rerender: true });
          } }, icon('trash'))));
    }));
    makeSortable(list, videos, () => changed({ rerender: true }));

    return h('div', {},
      pageHead('Video portfolio', 'Thêm link video, kéo biểu tượng ⋮⋮ để sắp xếp thứ tự hiển thị. Nhớ bấm "Lưu thay đổi".',
        h('button', { class: 'btn btn--primary', onclick: () => openVideoModal(null, '') }, icon('plus'), 'Thêm video')),
      h('div', { class: 'quick-add' }, quick, h('button', { class: 'btn btn--primary', onclick: addFromQuick }, icon('plus'), 'Thêm')),
      videos.length ? list : h('div', { class: 'empty-state' }, 'Chưa có video nào. Dán link video ở ô phía trên để bắt đầu.'));
  }

  function openVideoModal(index, presetUrl) {
    const isNew = index == null;
    const draft = isNew
      ? { id: uid('v'), title: '', description: '', url: presetUrl || '', thumbnail: '', category: '', visible: true }
      : clone(state.content.videos[index]);

    const box = h('div', { class: 'video-preview' });
    const status = h('small');
    let titleInput;

    function paintPreview(play = false) {
      box.textContent = '';
      const info = VideoUtils.parse(draft.url);
      status.textContent = '';
      status.style.color = '';
      if (!draft.url) {
        box.append(h('div', { class: 'ph' }, 'Dán link video để xem trước'));
        return;
      }
      if (!info) {
        status.textContent = 'Không nhận diện được link. Hỗ trợ: YouTube, Vimeo, Google Drive, TikTok, Facebook, file .mp4. Link khác sẽ mở ở tab mới.';
        status.style.color = 'var(--danger)';
        box.append(h('div', { class: 'ph' }, 'Không xem trước được link này'));
        return;
      }
      status.textContent = `Đã nhận diện: ${PROVIDER_LABEL[info.provider]}` + (info.provider === 'drive' ? ' — nhớ bật chia sẻ "Bất kỳ ai có đường liên kết"' : '');
      if (play) {
        if (info.provider === 'file') box.append(h('video', { src: info.embed, controls: true, autoplay: true }));
        else box.append(h('iframe', { src: info.embed, allow: 'autoplay; fullscreen; encrypted-media', allowfullscreen: true }));
        return;
      }
      const th = assetUrl(draft.thumbnail) || info.thumbnail;
      box.append(h('button', {
        type: 'button', class: 'ph', style: { background: th ? `#000 url("${th}") center/cover` : '#000', border: 0, cursor: 'pointer' },
        onclick: () => paintPreview(true),
      }, h('span', { class: 'btn btn--primary' }, icon('play'), 'Xem thử')));
    }

    let fetchTimer;
    async function autoTitle() {
      const info = VideoUtils.parse(draft.url);
      if (!info || draft.title) return;
      try {
        const r = await fetch('https://noembed.com/embed?url=' + encodeURIComponent(draft.url)).then((x) => x.json());
        if (r.title && !draft.title) {
          draft.title = r.title;
          titleInput.value = r.title;
        }
      } catch { /* bỏ qua */ }
    }

    // Các trường của modal ghi vào draft, không đánh dấu "chưa lưu" cho đến khi bấm Xong
    const bind = (key, el) => {
      el.value = draft[key] || '';
      el.addEventListener('input', () => {
        draft[key] = el.value;
        if (key === 'url') {
          paintPreview();
          clearTimeout(fetchTimer);
          fetchTimer = setTimeout(autoTitle, 500);
        }
        if (key === 'thumbnail') paintPreview();
      });
      return el;
    };

    const urlInput = bind('url', h('input', { placeholder: 'https://www.youtube.com/watch?v=…' }));
    titleInput = bind('title', h('input', { placeholder: 'Ví dụ: Wedding Film — Minh & Lan' }));
    const catList = h('datalist', { id: 'cat-list' }, categories().map((c) => h('option', { value: c })));

    // Ô thumbnail riêng dùng imageField nhưng ghi vào draft
    const thumbObj = { get thumbnail() { return draft.thumbnail; }, set thumbnail(v) { draft.thumbnail = v; paintPreview(); } };
    const thumbField = imageField(thumbObj, 'thumbnail', { label: 'Ảnh bìa riêng (không bắt buộc)', hint: 'Để trống sẽ tự lấy ảnh bìa từ YouTube / Vimeo / Drive.' });

    const body = h('div', { class: 'stack' },
      h('label', { class: 'field' }, h('span', {}, 'Link video *'), urlInput, status),
      box,
      h('label', { class: 'field' }, h('span', {}, 'Tiêu đề'), titleInput),
      h('label', { class: 'field' }, h('span', {}, 'Mô tả ngắn'), bind('description', h('input', { placeholder: 'Hiện bên dưới tiêu đề' }))),
      h('div', { class: 'grid-2' },
        h('label', { class: 'field' }, h('span', {}, 'Danh mục'), bind('category', h('input', { list: 'cat-list', placeholder: 'Ví dụ: Wedding, TVC, Sự kiện' })), catList, h('small', {}, 'Dùng để lọc video trên trang.')),
        h('div', { class: 'field' }, h('span', {}, 'Hiển thị'), (() => {
          const cb = h('input', { type: 'checkbox', checked: draft.visible, onchange: (e) => (draft.visible = e.target.checked) });
          return h('label', { class: 'switch', style: { height: '38px' } }, cb, h('i'), 'Hiện trên trang');
        })())),
      thumbField);

    paintPreview();
    if (presetUrl) autoTitle();

    modal({
      title: isNew ? 'Thêm video' : 'Sửa video',
      body,
      foot: (close) => [
        h('button', { class: 'btn', onclick: close }, 'Huỷ'),
        h('button', { class: 'btn btn--primary', onclick: () => {
          if (!draft.url.trim()) {
            toast('Vui lòng nhập link video', 'err');
            urlInput.focus();
            return;
          }
          draft.url = draft.url.trim();
          draft.category = (draft.category || '').trim();
          // Ghi vào changed() phải chạy sau khi gán vì imageField gọi changed() riêng
          if (isNew) state.content.videos.unshift(draft);
          else state.content.videos[index] = draft;
          close();
          changed({ rerender: true });
          toast(isNew ? 'Đã thêm video — bấm "Lưu thay đổi" để đăng lên trang' : 'Đã cập nhật video');
        } }, isNew ? 'Thêm video' : 'Xong'),
      ],
    });
  }

  /* ================= Tab: Bố cục ================= */

  const SECTION_INFO = {
    hero: { label: 'Banner đầu trang', desc: 'Tiêu đề lớn, nút và ảnh chính' },
    services: { label: 'Dịch vụ', desc: 'Hàng biểu tượng dịch vụ' },
    about: { label: 'Ảnh + nội dung', desc: 'Giới thiệu, câu chuyện…' },
    portfolio: { label: 'Lưới video', desc: 'Hiển thị video portfolio' },
    reviews: { label: 'Đánh giá khách hàng', desc: 'Avatar bay + thẻ đánh giá' },
    contact: { label: 'Liên hệ', desc: 'Email, điện thoại, mạng xã hội' },
  };

  const NEW_SECTION = {
    hero: () => ({ titleLines: ['Tiêu đề', 'của bạn'], buttonText: 'Xem thêm', buttonLink: '#', showreelUrl: '', image: '', imagePosition: 'right' }),
    services: () => ({ intro: '', items: [{ icon: 'film', title: 'Dựng phim' }, { icon: 'camera', title: 'Quay phim' }] }),
    about: () => ({ eyebrow: 'Tiêu đề nhỏ', title: 'Tiêu đề khối', text: 'Nội dung…', buttonText: '', buttonLink: '', image: '', imagePosition: 'left' }),
    portfolio: () => ({ eyebrow: '', title: 'Video', columns: 3, aspect: '16:9', showFilter: false, category: '', limit: 0 }),
    reviews: () => ({ title: 'Khách hàng nói gì', rating: 5, items: [] }),
    contact: () => ({ eyebrow: '', title: 'Liên hệ', text: '', buttonText: 'Gửi email' }),
  };

  const linkHint = () => `Dùng #id để cuộn tới một khối, ví dụ ${state.content.sections.map((s) => '#' + s.id).slice(0, 3).join(', ')}`;

  function viewLayout() {
    const sections = state.content.sections;
    const list = h('div', {}, sections.map((sec, i) => sectionCard(sec, i)));
    makeSortable(list, sections, () => changed({ rerender: true }));

    const typeSelect = h('select', { class: 'input', style: { width: 'auto' } },
      Object.entries(SECTION_INFO).map(([t, inf]) => h('option', { value: t }, inf.label)));

    return h('div', {},
      pageHead('Bố cục trang', 'Kéo ⋮⋮ để đổi thứ tự khối, bật/tắt để ẩn hiện, bấm vào khối để sửa nội dung. Có thể thêm nhiều khối cùng loại.'),
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
    const d = sec.data;
    if (sec.type === 'hero') return (d.titleLines || []).join(' ') || 'Banner';
    return d.title || SECTION_INFO[sec.type].label;
  }

  function sectionEditor(sec) {
    const d = sec.data;
    switch (sec.type) {
      case 'hero':
        return h('div', { class: 'stack' },
          field(d, 'titleLines', { type: 'lines', label: 'Tiêu đề (mỗi dòng một hàng)', rows: 3 }),
          h('div', { class: 'grid-2' },
            field(d, 'buttonText', { label: 'Chữ trên nút' }),
            field(d, 'buttonLink', { label: 'Link nút', hint: linkHint() })),
          field(d, 'showreelUrl', { label: 'Video showreel (nút ▶)', placeholder: 'Link YouTube/Vimeo…, để trống để ẩn nút' }),
          imageField(d, 'image', { label: 'Ảnh chính', hint: 'Nên dùng ảnh ngang, tối thiểu 1200px.' }),
          field(d, 'imagePosition', { type: 'select', label: 'Vị trí ảnh', options: [['right', 'Bên phải'], ['left', 'Bên trái']] }));

      case 'services': {
        const items = h('div', { class: 'sub-list' }, d.items.map((it, j) =>
          h('div', { class: 'sub-item', 'data-index': j },
            h('div', { class: 'sub-item__head' }, gripHandle(), h('div', { style: { flex: 1 } }, field(it, 'title', { placeholder: 'Tên dịch vụ' })),
              h('button', { class: 'btn btn--ghost btn--icon btn--danger', 'aria-label': 'Xoá', onclick: () => { d.items.splice(j, 1); changed({ rerender: true }); } }, icon('trash'))),
            h('div', { class: 'icon-pick' }, Object.entries(state.meta.icons).map(([name, svg]) =>
              h('button', { type: 'button', title: name, class: it.icon === name ? 'is-active' : '', html: svg, onclick: () => { it.icon = name; changed({ rerender: true }); } }))))));
        makeSortable(items, d.items, () => changed({ rerender: true }));
        return h('div', { class: 'stack' },
          field(d, 'intro', { type: 'textarea', label: 'Đoạn giới thiệu bên trái', rows: 3, hint: 'Mỗi dòng một hàng. Để trống để ẩn.' }),
          h('div', { class: 'field' }, h('span', {}, 'Danh sách dịch vụ'), items),
          h('div', {}, h('button', { class: 'btn btn--sm', onclick: () => { d.items.push({ icon: 'sparkles', title: 'Dịch vụ mới' }); changed({ rerender: true }); } }, icon('plus'), 'Thêm dịch vụ')));
      }

      case 'about':
        return h('div', { class: 'stack' },
          h('div', { class: 'grid-2' }, field(d, 'eyebrow', { label: 'Tiêu đề nhỏ' }), field(d, 'title', { label: 'Tiêu đề lớn' })),
          field(d, 'text', { type: 'textarea', label: 'Nội dung', rows: 5 }),
          h('div', { class: 'grid-2' }, field(d, 'buttonText', { label: 'Chữ trên nút', placeholder: 'Để trống để ẩn nút' }), field(d, 'buttonLink', { label: 'Link nút', hint: linkHint() })),
          imageField(d, 'image', { label: 'Ảnh' }),
          field(d, 'imagePosition', { type: 'select', label: 'Vị trí ảnh', options: [['left', 'Bên trái'], ['right', 'Bên phải']] }));

      case 'portfolio':
        return h('div', { class: 'stack' },
          h('div', { class: 'grid-2' }, field(d, 'eyebrow', { label: 'Tiêu đề nhỏ' }), field(d, 'title', { label: 'Tiêu đề lớn' })),
          h('div', { class: 'grid-3' },
            field(d, 'columns', { type: 'select', number: true, label: 'Số cột', options: [[1, '1 cột'], [2, '2 cột'], [3, '3 cột'], [4, '4 cột']] }),
            field(d, 'aspect', { type: 'select', label: 'Tỉ lệ khung', options: [['16:9', '16:9 (ngang)'], ['4:3', '4:3'], ['1:1', '1:1 (vuông)'], ['9:16', '9:16 (dọc, Reels/TikTok)']] }),
            field(d, 'limit', { type: 'number', label: 'Số video tối đa', min: 0, max: 200, hint: '0 = hiện tất cả' })),
          field(d, 'category', { type: 'select', label: 'Chỉ hiện danh mục', options: [['', 'Tất cả danh mục'], ...categories()] }),
          field(d, 'showFilter', { type: 'switch', label: 'Hiện nút lọc theo danh mục' }),
          h('p', { class: 'dim', style: { margin: 0 } }, 'Video được quản lý ở tab ', h('a', { href: '#', onclick: (e) => { e.preventDefault(); switchTab('videos'); } }, 'Video'), '.'));

      case 'reviews': {
        const items = h('div', { class: 'sub-list' }, d.items.map((it, j) =>
          h('div', { class: 'sub-item', 'data-index': j },
            h('div', { class: 'sub-item__head' }, gripHandle(), h('strong', { style: { flex: 1, fontWeight: 500 } }, it.name || 'Khách hàng'),
              h('button', { class: 'btn btn--ghost btn--icon btn--danger', 'aria-label': 'Xoá', onclick: () => { d.items.splice(j, 1); changed({ rerender: true }); } }, icon('trash'))),
            h('div', { class: 'grid-3' },
              field(it, 'name', { label: 'Tên' }),
              field(it, 'role', { label: 'Chức danh' }),
              field(it, 'rating', { type: 'select', number: true, label: 'Số sao', options: [5, 4, 3, 2, 1].map((n) => [n, '★'.repeat(n)]) })),
            field(it, 'text', { type: 'textarea', label: 'Nội dung đánh giá', rows: 2 }),
            imageField(it, 'avatar', { label: 'Ảnh đại diện' }))));
        makeSortable(items, d.items, () => changed({ rerender: true }));
        return h('div', { class: 'stack' },
          h('div', { class: 'grid-2' },
            field(d, 'title', { label: 'Tiêu đề' }),
            field(d, 'rating', { type: 'select', number: true, label: 'Số sao dưới tiêu đề', options: [[5, '★★★★★'], [4, '★★★★'], [0, 'Ẩn']] })),
          h('div', { class: 'field' }, h('span', {}, 'Đánh giá'), items),
          h('div', {}, h('button', { class: 'btn btn--sm', onclick: () => { d.items.push({ name: '', role: '', avatar: '', text: '', rating: 5 }); changed({ rerender: true }); } }, icon('plus'), 'Thêm đánh giá')));
      }

      case 'contact':
        return h('div', { class: 'stack' },
          h('div', { class: 'grid-2' }, field(d, 'eyebrow', { label: 'Tiêu đề nhỏ' }), field(d, 'title', { label: 'Tiêu đề lớn' })),
          field(d, 'text', { type: 'textarea', label: 'Nội dung', rows: 2 }),
          field(d, 'buttonText', { label: 'Chữ trên nút email', placeholder: 'Để trống để ẩn' }),
          h('p', { class: 'dim', style: { margin: 0 } }, 'Email, số điện thoại, mạng xã hội sửa ở tab ', h('a', { href: '#', onclick: (e) => { e.preventDefault(); switchTab('settings'); } }, 'Cài đặt'), '.'));
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
          field(s, 'accentColor', { type: 'color', label: 'Màu nhấn (nút, sao…)' }),
          field(s, 'headingFont', { type: 'select', label: 'Font tiêu đề', options: state.meta.fonts }))),
      h('div', { class: 'panel stack' }, h('h3', {}, 'Nút trên menu'),
        h('div', { class: 'grid-2' },
          field(s, 'contactButtonText', { label: 'Chữ trên nút', placeholder: 'Để trống để ẩn' }),
          field(s, 'contactButtonLink', { label: 'Link', hint: 'Ví dụ #contact, https://zalo.me/…, tel:0900…' }))),
      h('div', { class: 'panel stack' }, h('h3', {}, 'Thông tin liên hệ'),
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
        wrap.replaceChildren(...(files.length ? files.map((f) =>
          h('div', { class: 'file' },
            h('div', { class: 'file__img', style: { backgroundImage: `url("${assetUrl(f.url)}")` } }),
            h('div', { class: 'file__meta' },
              h('span', { title: f.name }, `${fmtSize(f.size)}${used.includes(f.url) ? ' · đang dùng' : ''}`),
              h('button', { class: 'btn btn--ghost btn--icon', title: 'Copy link', 'aria-label': 'Copy link', onclick: async () => {
                const full = SITE + f.url;
                try { await navigator.clipboard.writeText(full); toast('Đã copy link'); } catch { prompt('Link file:', full); }
              } }, icon('copy')),
              h('button', { class: 'btn btn--ghost btn--icon btn--danger', title: 'Xoá', 'aria-label': 'Xoá', onclick: async () => {
                const warn = used.includes(f.url) ? ' File này đang được dùng trên trang!' : '';
                if (!(await confirmBox(`Xoá file này khỏi repo?${warn}`, { ok: 'Xoá', danger: true }))) return;
                try { await deleteFile(f.path, f.sha, `Xoá ảnh ${f.name}`); toast('Đã xoá'); load(); } catch (err) { toast(err.message, 'err'); }
              } }, icon('trash'))))) : [h('p', { class: 'muted' }, 'Chưa có ảnh nào.')]));
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
      icon('upload'), h('span', { class: 'muted', style: { flex: 1 } }, `Kéo thả ảnh vào đây hoặc bấm nút. Ảnh tối đa ${MAX_IMAGE_MB}MB. Video hãy đưa lên YouTube/Drive rồi dán link.`),
      h('button', { class: 'btn btn--primary', onclick: () => {
        const inp = h('input', { type: 'file', multiple: true, accept: 'image/*' });
        inp.onchange = () => doUpload([...inp.files]);
        inp.click();
      } }, 'Chọn ảnh'));
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('is-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('is-over'));
    zone.addEventListener('drop', (e) => { e.preventDefault(); zone.classList.remove('is-over'); doUpload([...e.dataTransfer.files]); });

    load();
    return h('div', {},
      pageHead('Thư viện ảnh', 'Ảnh đã tải lên được lưu trong repo GitHub và có trên web sau khoảng 1 phút.'),
      zone, wrap);
  }

  /* ================= Tab: Tài khoản ================= */

  function viewAccount() {
    const repoUrl = `https://github.com/${CFG.owner}/${CFG.repo}`;
    const out = h('div', {},
      pageHead('Tài khoản', `Đang đăng nhập bằng mã truy cập của "${state.user.username}" (${state.user.role === 'root' ? 'chủ repo — toàn quyền' : 'quản lý nội dung'}).`),
      h('div', { class: 'panel stack' }, h('h3', {}, 'Mã truy cập trên máy này'),
        h('p', { class: 'dim', style: { margin: 0 } }, 'Mã truy cập giống như mật khẩu. Nếu dùng máy chung, hãy đăng xuất sau khi dùng xong.'),
        h('div', {}, h('button', { class: 'btn btn--danger', onclick: logout }, icon('logout'), 'Đăng xuất & xoá mã khỏi máy này'))));

    if (state.user.role === 'root') {
      out.append(h('div', { class: 'panel stack' }, h('h3', {}, 'Cấp quyền cho khách hàng'),
        h('ol', { class: 'steps' },
          h('li', {}, 'Mở ', h('a', { href: 'https://github.com/settings/personal-access-tokens/new', target: '_blank', rel: 'noopener' }, 'GitHub → tạo Fine-grained token'), '.'),
          h('li', {}, 'Token name: ví dụ ', h('b', {}, 'khach-hang'), '. Expiration: chọn thời hạn (ví dụ 1 năm).'),
          h('li', {}, 'Repository access: ', h('b', {}, 'Only select repositories'), ' → chọn ', h('b', {}, `${CFG.owner}/${CFG.repo}`), '.'),
          h('li', {}, 'Permissions → Repository permissions: ', h('b', {}, 'Contents: Read and write'), ', ', h('b', {}, 'Actions: Read-only'), '.'),
          h('li', {}, 'Bấm Generate token, copy mã và gửi cho khách. Khách vào ', h('b', {}, SITE + 'admin/'), ' và dán mã để đăng nhập.')),
        h('p', { class: 'dim', style: { margin: 0 } }, 'Muốn thu hồi quyền: vào ', h('a', { href: 'https://github.com/settings/personal-access-tokens', target: '_blank', rel: 'noopener' }, 'danh sách token'), ' và bấm Revoke. Mỗi người nên có một mã riêng.')),
        h('div', { class: 'panel stack' }, h('h3', {}, 'Repo & lịch sử deploy'),
          h('div', { class: 'row row--wrap' },
            h('a', { class: 'btn', href: repoUrl, target: '_blank', rel: 'noopener' }, icon('external'), 'Mở repo'),
            h('a', { class: 'btn', href: `${repoUrl}/actions`, target: '_blank', rel: 'noopener' }, icon('external'), 'Lịch sử deploy'),
            h('a', { class: 'btn', href: `${repoUrl}/settings/pages`, target: '_blank', rel: 'noopener' }, icon('external'), 'Cài đặt GitHub Pages'))));
    }
    return out;
  }

  /* ================= Tab: Sao lưu ================= */

  function viewBackup() {
    const listBox = h('div', {}, h('p', { class: 'muted' }, 'Đang tải…'));

    // Nạp một phiên bản vào trình soạn thảo (chưa lưu) để người dùng xem trước rồi bấm Lưu
    function loadVersion(data, label) {
      state.content = P.normalizeContent(data);
      renderApp();
      toast(`Đã nạp ${label} — xem trước rồi bấm "Lưu thay đổi" để áp dụng`);
    }

    gh(`${REPO}/commits?path=${encodeURIComponent(CFG.contentPath)}&sha=${encodeURIComponent(CFG.branch)}&per_page=30`).then((commits) => {
      listBox.replaceChildren(commits.length
        ? h('table', { class: 'table' }, h('tbody', {}, commits.map((c, i) => {
            const when = new Date(c.commit.author.date).toLocaleString('vi-VN');
            return h('tr', {},
              h('td', {}, when, i === 0 ? h('span', { class: 'role', style: { marginLeft: '8px' } }, 'hiện tại') : null),
              h('td', { class: 'dim' }, c.commit.message.split('\n')[0]),
              h('td', { style: { textAlign: 'right' } }, i === 0 ? null :
                h('button', { class: 'btn btn--sm', onclick: async () => {
                  if (isDirty() && !(await confirmBox('Bạn đang có thay đổi chưa lưu, chúng sẽ bị thay thế. Tiếp tục?', { ok: 'Tiếp tục', danger: true }))) return;
                  try {
                    const file = await getFile(CFG.contentPath, c.sha);
                    loadVersion(JSON.parse(b64ToText(file.content)), `phiên bản ${when}`);
                  } catch (err) { toast(err.message, 'err'); }
                } }, 'Khôi phục')));
          })))
        : h('p', { class: 'muted' }, 'Chưa có lịch sử.'));
    }).catch((err) => listBox.replaceChildren(h('p', { class: 'error' }, err.message)));

    return h('div', {},
      pageHead('Sao lưu & khôi phục', 'Mỗi lần Lưu là một phiên bản trong lịch sử GitHub — có thể quay lại bất cứ lúc nào.'),
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
    state.meta = {
      fonts: P.FONTS,
      icons: Object.fromEntries(P.ICONS.map((n) => [n, P.icon(n, 22)])),
    };
    setContent(await loadContent());
    render();
  }

  function render() {
    if (!state.user) return renderLogin();
    if (!state.content) return boot().catch((err) => renderLogin(err.message));
    renderApp();
  }

  // Tự đăng nhập nếu máy đã lưu mã truy cập
  const saved = getToken();
  if (!saved) renderLogin();
  else signIn(saved).then(render).catch((err) => {
    if (err.status === 401) setToken(null);
    renderLogin(err.message);
  });
})();
