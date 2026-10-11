// Nội dung mặc định khi chạy lần đầu. Khách hàng sửa tất cả trong /admin.

const unsplash = (id, w = 1200) => `https://images.unsplash.com/${id}?w=${w}&q=80&auto=format&fit=crop`;

module.exports = {
  settings: {
    siteName: 'Thanh Hải Video',
    logoText: 'THANHHAI',
    logoSub: 'STUDIO',
    logoImage: '',
    favicon: '',
    metaTitle: 'Thanh Hải Video — Video Editor & Videographer',
    metaDescription: 'Dựng phim, quay phim sự kiện, TVC, video thương hiệu và nội dung mạng xã hội.',
    ogImage: '',
    theme: 'dark', // 'dark' | 'light' | 'auto' (theo thiết bị người xem)
    themeToggle: true, // hiện nút để người xem tự đổi sáng/tối
    accentColor: '#ff9f1c',
    backgroundColor: '#07070b',
    lightBackgroundColor: '#f6f5f2',
    headingFont: 'Montserrat',
    contactButtonText: 'Liên hệ',
    contactButtonLink: '#contact',
    email: 'hello@example.com',
    phone: '0900 000 000',
    address: 'TP. Hồ Chí Minh',
    socials: {
      facebook: 'https://facebook.com/',
      youtube: 'https://youtube.com/',
      instagram: '',
      tiktok: '',
      zalo: '',
    },
    footerText: '© {year} Thanh Hải Video. All rights reserved.',
  },

  sections: [
    {
      id: 'hero',
      type: 'hero',
      enabled: true,
      navLabel: 'Trang chủ',
      data: {
        titleLines: ['Next Level', 'Amazing', 'Videographer'],
        buttonText: 'Xem thêm',
        buttonLink: '#portfolio',
        showreelUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
        image: unsplash('photo-1601506521937-0121a7fc2a6b', 1400),
        imagePosition: 'right',
      },
    },
    {
      id: 'services',
      type: 'services',
      enabled: true,
      navLabel: '',
      data: {
        intro: 'Supporting Digital Business\nBranding Agencies\nPrivate Documentaries',
        items: [
          { icon: 'film', title: 'Video Editing' },
          { icon: 'users', title: 'Cameraman' },
          { icon: 'camera', title: 'Videography' },
          { icon: 'tag', title: 'Branding' },
        ],
      },
    },
    {
      id: 'about',
      type: 'about',
      enabled: true,
      navLabel: 'Giới thiệu',
      data: {
        eyebrow: 'Về chúng tôi',
        title: 'We Always Make The Best',
        text: 'Hơn 5 năm kinh nghiệm dựng phim và quay phim cho thương hiệu, sự kiện và nhà sáng tạo nội dung. Mỗi khung hình đều được chăm chút để kể câu chuyện của bạn một cách cuốn hút nhất.',
        buttonText: 'Liên hệ ngay',
        buttonLink: '#contact',
        image: unsplash('photo-1574717024653-61fd2cf4d44d', 1000),
        imagePosition: 'left',
      },
    },
    {
      id: 'portfolio',
      type: 'portfolio',
      enabled: true,
      navLabel: 'Portfolio',
      data: {
        eyebrow: 'Our Portfolio',
        title: 'Latest Work',
        columns: 3,
        aspect: '4:3',
        showFilter: true,
      },
    },
    {
      id: 'reviews',
      type: 'reviews',
      enabled: true,
      navLabel: 'Đánh giá',
      data: {
        title: 'About 1000+ Positive Review',
        rating: 5,
        items: [
          { name: 'Minh Anh', role: 'Marketing Manager', avatar: unsplash('photo-1494790108377-be9c29b29330', 200), text: 'Video ra mắt sản phẩm vượt mong đợi, đúng deadline và cực kỳ chuyên nghiệp.', rating: 5 },
          { name: 'Quốc Bảo', role: 'YouTuber', avatar: unsplash('photo-1500648767791-00dcc994a43e', 200), text: 'Edit nhanh, bắt trend tốt, view kênh tăng rõ rệt sau khi hợp tác.', rating: 5 },
          { name: 'Thu Trang', role: 'Wedding Planner', avatar: unsplash('photo-1438761681033-6461ffad8d80', 200), text: 'Phim cưới cảm xúc, màu đẹp, cô dâu chú rể xem xong đều khóc.', rating: 5 },
          { name: 'Hoàng Long', role: 'Founder, Startup', avatar: unsplash('photo-1507003211169-0a1dd7228f2d', 200), text: 'Hiểu brief nhanh, góp ý sáng tạo và chỉnh sửa rất nhiệt tình.', rating: 5 },
          { name: 'Ngọc Hân', role: 'Event Organizer', avatar: unsplash('photo-1544005313-94ddf0286df2', 200), text: 'Quay sự kiện gọn gàng, highlight có ngay trong ngày.', rating: 5 },
          { name: 'Đức Huy', role: 'Gamer / Streamer', avatar: unsplash('photo-1472099645785-5658abf4ff4e', 200), text: 'Montage gaming cực cháy, hiệu ứng mượt.', rating: 5 },
        ],
      },
    },
    {
      id: 'contact',
      type: 'contact',
      enabled: true,
      navLabel: '', // đã có nút "Liên hệ" trên menu
      data: {
        eyebrow: 'Hợp tác',
        title: 'Cùng tạo nên video tiếp theo',
        text: 'Gửi ý tưởng của bạn, chúng tôi sẽ phản hồi trong vòng 24 giờ.',
        buttonText: 'Gửi email',
      },
    },
  ],

  videos: [
    { id: 'v1', title: 'New Year Festival', description: 'Highlight sự kiện năm mới', url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', thumbnail: '', category: 'Sự kiện', visible: true },
    { id: 'v2', title: 'Office Special Event', description: 'Year End Party công ty', url: 'https://www.youtube.com/watch?v=eRsGyueVLvQ', thumbnail: '', category: 'Sự kiện', visible: true },
    { id: 'v3', title: 'School Trip', description: 'Kỷ niệm dã ngoại', url: 'https://www.youtube.com/watch?v=R6MlUcmOul8', thumbnail: '', category: 'Vlog', visible: true },
    { id: 'v4', title: 'Cooking Channel', description: 'Series nấu ăn cho YouTube', url: 'https://www.youtube.com/watch?v=WhWc3b3KhnY', thumbnail: '', category: 'YouTube', visible: true },
    { id: 'v5', title: 'Memories Album', description: 'Phim kỷ niệm gia đình', url: 'https://www.youtube.com/watch?v=_cMxraX_5RE', thumbnail: '', category: 'Vlog', visible: true },
    { id: 'v6', title: 'Gaming Video', description: 'Montage gaming', url: 'https://www.youtube.com/watch?v=mN0zPOpADL4', thumbnail: '', category: 'YouTube', visible: true },
  ],
};
