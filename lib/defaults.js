// Nội dung mặc định khi chạy lần đầu. Khách hàng sửa tất cả trong /admin.

const unsplash = (id, w = 1200, extra = '') => `https://images.unsplash.com/${id}?w=${w}&q=80&auto=format&fit=crop${extra}`;
// Ảnh "trước khi chỉnh màu" mô phỏng footage LOG: giảm bão hoà và độ tương phản
const logLook = (id, w) => unsplash(id, w, '&sat=-70&con=-45&exp=6');

module.exports = {
  version: 3,
  settings: {
    siteName: 'Thanh Hải Video',
    logoText: 'THANH HẢI',
    logoSub: 'Video Editor',
    logoImage: '',
    favicon: '',
    metaTitle: 'Thanh Hải — Video Editor & Colorist',
    metaDescription: 'Dựng phim, chỉnh màu, TVC, MV ca nhạc, phim ngắn và nội dung mạng xã hội.',
    ogImage: '',
    theme: 'dark', // 'dark' | 'light' | 'auto' (theo thiết bị người xem)
    themeToggle: true, // hiện nút để người xem tự đổi sáng/tối
    accentColor: '#1fb5a3',
    backgroundColor: '#0e1012',
    lightBackgroundColor: '#f4f5f4',
    headingFont: 'Oswald',
    contactButtonText: '',
    contactButtonLink: '#contact',
    email: 'hello@example.com',
    phone: '0900 000 000',
    address: 'TP. Hồ Chí Minh',
    socials: {
      facebook: 'https://facebook.com/',
      youtube: 'https://youtube.com/',
      instagram: '',
      tiktok: '',
      behance: '',
      linkedin: '',
      x: '',
      zalo: '',
    },
    footerText: '© {year} Thanh Hải Video. All rights reserved.',
  },

  sections: [
    {
      id: 'showreel',
      type: 'showreel',
      enabled: true,
      navLabel: 'Trang chủ',
      data: {
        title: 'SHOWREEL 2026',
        subtitle: 'Crafting cinematic stories',
        videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
        image: unsplash('photo-1601506521937-0121a7fc2a6b', 1800),
      },
    },
    {
      id: 'about',
      type: 'profile',
      enabled: true,
      navLabel: 'Giới thiệu',
      data: {
        image: unsplash('photo-1507003211169-0a1dd7228f2d', 700),
        title: 'Xin chào, mình là Thanh Hải',
        text: 'Video editor & colorist với hơn 5 năm dựng TVC, MV ca nhạc và phim ngắn. Mình tập trung vào nhịp dựng, màu sắc và âm thanh để mỗi khung hình kể đúng câu chuyện của thương hiệu.',
        buttonText: 'Liên hệ ngay',
        buttonLink: '#contact',
        showContact: true,
        showSocials: true,
        stats: [
          { value: '5+', label: 'Năm kinh nghiệm' },
          { value: '120+', label: 'Dự án hoàn thiện' },
        ],
      },
    },
    {
      id: 'portfolio',
      type: 'portfolio',
      enabled: true,
      navLabel: 'Dự án',
      data: {
        title: 'Lưới dự án (Projects)',
        columns: 3,
        aspect: '16:10',
        showFilter: true,
        category: '',
        limit: 0,
      },
    },
    {
      id: 'behind',
      type: 'bts',
      enabled: true,
      navLabel: 'Hậu trường',
      data: {
        title: 'Behind the scenes',
        subtitle: 'Hậu trường kỹ thuật',
        timelineImage: unsplash('photo-1574717024653-61fd2cf4d44d', 1200),
        beforeImage: logLook('photo-1492691527719-9d1e07e534b4', 1200),
        afterImage: unsplash('photo-1492691527719-9d1e07e534b4', 1200),
        beforeLabel: 'LOG',
        afterLabel: 'Color grade 4K',
        formats: [
          { image: unsplash('photo-1478720568477-152d9b164e26', 1200), label: 'Bản 16:9 (YouTube)', aspect: '16:9' },
          { image: unsplash('photo-1601506521937-0121a7fc2a6b', 600), label: 'Bản 9:16 (TikTok/Reels)', aspect: '9:16' },
          { image: unsplash('photo-1485846234645-a62644f84728', 800), label: 'Bản 1:1 (Feed)', aspect: '1:1' },
        ],
        bts: [
          { group: 'Cảnh quay on-set & BTS', image: unsplash('photo-1516035069371-29a1b244cc32', 800), caption: 'Setup máy quay' },
          { group: 'Cảnh quay on-set & BTS', image: unsplash('photo-1485846234645-a62644f84728', 800), caption: 'Slate từng cảnh' },
          { group: 'VFX & sound breakdown', image: unsplash('photo-1590602847861-f357a9332bbc', 800), caption: 'Thu âm & sound design' },
        ],
      },
    },
    {
      id: 'contact',
      type: 'contact',
      enabled: true,
      navLabel: 'Liên hệ',
      data: {
        title: 'Liên hệ & hợp tác',
        text: 'Gửi ý tưởng hoặc brief của bạn, mình sẽ phản hồi trong vòng 24 giờ.',
        showForm: true,
        buttonText: 'Gửi tin nhắn',
      },
    },
  ],

  videos: [
    {
      id: 'v1',
      title: 'New Year Festival',
      description: 'Lead Editor, Colorist',
      url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
      thumbnail: '',
      category: 'TVC / Commercial',
      visible: true,
      client: 'Thương hiệu ABC',
      role: 'Lead Editor, Colorist',
      software: 'DaVinci Resolve, Premiere Pro',
      equipment: 'Sony FX6, DJI Ronin',
      year: '2026',
      summary: 'Video highlight sự kiện năm mới: dựng nhịp nhanh theo beat nhạc, chỉnh màu ấm và xuất nhiều phiên bản cho YouTube, TikTok và Reels.',
    },
    { id: 'v2', title: 'Office Special Event', description: 'Editor', url: 'https://www.youtube.com/watch?v=eRsGyueVLvQ', thumbnail: '', category: 'TVC / Commercial', visible: true, role: 'Editor' },
    { id: 'v3', title: 'School Trip', description: 'Editor, Colorist', url: 'https://www.youtube.com/watch?v=R6MlUcmOul8', thumbnail: '', category: 'Short film', visible: true, role: 'Editor, Colorist' },
    { id: 'v4', title: 'Cooking Channel', description: 'Editor', url: 'https://www.youtube.com/watch?v=WhWc3b3KhnY', thumbnail: '', category: 'Music video', visible: true, role: 'Editor' },
    { id: 'v5', title: 'Memories Album', description: 'Editor, Colorist', url: 'https://www.youtube.com/watch?v=_cMxraX_5RE', thumbnail: '', category: 'Short film', visible: true, role: 'Editor, Colorist' },
    { id: 'v6', title: 'Gaming Video', description: 'Editor, VFX', url: 'https://www.youtube.com/watch?v=mN0zPOpADL4', thumbnail: '', category: 'Music video', visible: true, role: 'Editor, VFX' },
  ],
};
