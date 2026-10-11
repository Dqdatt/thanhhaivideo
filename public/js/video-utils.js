/*
 * Nhận diện link video (YouTube, Vimeo, Google Drive, TikTok, Facebook, file .mp4)
 * và trả về link nhúng + thumbnail tự động.
 * Dùng chung cho server (require) và trình duyệt (window.VideoUtils).
 */
(function (root) {
  function parse(rawUrl) {
    const url = String(rawUrl || '').trim();
    if (!url) return null;

    let m;

    // YouTube: watch?v=, youtu.be/, shorts/, embed/, live/
    m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/|v\/)|youtu\.be\/)([\w-]{11})/i);
    if (m) {
      const id = m[1];
      return {
        provider: 'youtube',
        id,
        vertical: /\/shorts\//i.test(url),
        embed: `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`,
        thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        // Ảnh 1280x720 không viền đen, nhưng không phải video nào cũng có
        thumbnailHd: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
      };
    }

    // Vimeo: vimeo.com/123, vimeo.com/channels/x/123, player.vimeo.com/video/123
    m = url.match(/vimeo\.com\/(?:.*\/)?(?:video\/)?(\d{6,})(?:\/([\da-f]+))?/i);
    if (m) {
      const id = m[1];
      const hash = m[2] ? `&h=${m[2]}` : '';
      return {
        provider: 'vimeo',
        id,
        embed: `https://player.vimeo.com/video/${id}?autoplay=1${hash}`,
        thumbnail: `https://vumbnail.com/${id}.jpg`,
      };
    }

    // Google Drive: /file/d/ID/..., open?id=ID, uc?id=ID
    m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:.*&)?id=)([\w-]{20,})/i);
    if (m) {
      const id = m[1];
      return {
        provider: 'drive',
        id,
        embed: `https://drive.google.com/file/d/${id}/preview`,
        thumbnail: `https://drive.google.com/thumbnail?id=${id}&sz=w800`,
      };
    }

    // TikTok: tiktok.com/@user/video/ID
    m = url.match(/tiktok\.com\/.*\/video\/(\d+)/i);
    if (m) {
      return {
        provider: 'tiktok',
        id: m[1],
        vertical: true,
        embed: `https://www.tiktok.com/embed/v2/${m[1]}`,
        thumbnail: '',
      };
    }

    // Facebook video / reel
    if (/facebook\.com\/.+\/(videos|reel)|fb\.watch\//i.test(url)) {
      return {
        provider: 'facebook',
        id: '',
        embed: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&autoplay=true`,
        thumbnail: '',
      };
    }

    // File video trực tiếp
    if (/^(https?:\/\/|\/)[^\s]+\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url)) {
      return { provider: 'file', id: '', embed: url, thumbnail: '' };
    }

    return null;
  }

  const api = { parse };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.VideoUtils = api;
})(typeof window !== 'undefined' ? window : globalThis);
