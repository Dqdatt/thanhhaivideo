// Kiểm tra trước video YouTube nào có ảnh bìa HD (maxresdefault) để trang không phải
// tải ảnh 404 rồi mới chuyển sang ảnh thường (gây nháy ô trống).
const VideoUtils = require('../public/js/video-utils');

const cache = new Map(); // id -> 'hd' | 'hq' | 'pending'

function check(id) {
  if (cache.has(id) || typeof fetch !== 'function') return;
  cache.set(id, 'pending');
  fetch(`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`, { method: 'HEAD', signal: AbortSignal.timeout(6000) })
    .then((r) => cache.set(id, r.ok ? 'hd' : 'hq'))
    .catch(() => cache.delete(id)); // lỗi mạng: thử lại lần sau
}

// Gọi khi khởi động và mỗi lần lưu nội dung
function warm(content) {
  for (const v of content.videos || []) {
    const info = VideoUtils.parse(v.url);
    if (info && info.provider === 'youtube') check(info.id);
  }
}

const status = (id) => cache.get(id);

module.exports = { warm, status };
