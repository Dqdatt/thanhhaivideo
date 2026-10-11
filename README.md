# Portfolio cho Video Editor

Trang portfolio tối giản theo phong cách "Videograph", chạy miễn phí trên **GitHub Pages**, có trang **`/admin`** để khách hàng tự thêm link video, sửa nội dung và sắp xếp bố cục mà không cần đụng vào code.

- **Trang web**: https://thanhhaivideo.com
- **Trang quản trị**: https://thanhhaivideo.com/admin/

## Cách hoạt động

```
Khách bấm "Lưu" trong /admin
        │  (GitHub API, dùng mã truy cập)
        ▼
content/content.json được commit vào repo
        │  (GitHub Actions tự chạy)
        ▼
scripts/build.js render ra HTML tĩnh  ──►  GitHub Pages  ──►  thanhhaivideo.com
                                  (khoảng 30–60 giây)
```

- Không có server, không có database. Toàn bộ nội dung nằm trong repo: `content/content.json` (chữ, video, bố cục, cài đặt) và `content/uploads/` (ảnh).
- Trang admin xem trước thay đổi ngay trong trình duyệt. Bấm Lưu thì web thật cập nhật sau khoảng 1 phút; góc trên admin có báo trạng thái.
- Mỗi lần lưu là một commit, nên tab **Sao lưu** khôi phục được về bất kỳ phiên bản nào.

## Tính năng

**Trang web**
- Banner, Dịch vụ, Giới thiệu, Lưới video, Đánh giá, Liên hệ
- Bấm vào video để mở popup phát ngay trên trang. Hỗ trợ link **YouTube (cả Shorts), Vimeo, Google Drive, TikTok, Facebook, file .mp4**, ảnh bìa lấy tự động
- Lọc video theo danh mục, responsive trên điện thoại, HTML render sẵn nên tốt cho SEO
- **Giao diện sáng / tối / tự động theo thiết bị**, có nút ☀/☾ để người xem tự đổi

**Trang quản trị**
- **Video**: dán link là tự nhận diện nền tảng và lấy tiêu đề; kéo thả sắp xếp; ẩn/hiện; danh mục; ảnh bìa riêng
- **Bố cục**: kéo thả đổi thứ tự khối; bật/tắt, thêm, nhân bản, xoá khối; số cột; tỉ lệ khung (16:9, 4:3, 1:1, 9:16)
- **Cài đặt**: logo, favicon, chế độ sáng/tối, màu, font, liên hệ, mạng xã hội, SEO
- **Thư viện ảnh**: upload ảnh (tối đa 10MB/ảnh) vào repo
- **Sao lưu**: lịch sử mọi lần lưu, khôi phục 1 click, xuất/nhập file JSON

---

## Cài đặt lần đầu (chủ repo làm 1 lần)

### 1. Bật GitHub Pages

1. Vào repo → **Settings** → **Pages**.
2. Ở **Build and deployment → Source**, chọn **GitHub Actions**.
3. Vào tab **Actions**, mở lần chạy "Deploy GitHub Pages" gần nhất và bấm **Re-run all jobs** (hoặc **Run workflow**).
4. Chạy xong (có dấu ✓), web có tại `https://dqdatt.github.io/thanhhaivideo/`.

### 2. Trỏ tên miền thanhhaivideo.com

**a) Thêm bản ghi DNS** ở trang quản lý tên miền (Mắt Bão, PA Vietnam, Tenten, iNET, Nhân Hòa…):

| Loại | Tên / Host | Giá trị | TTL |
|---|---|---|---|
| A | `@` | `185.199.108.153` | 3600 |
| A | `@` | `185.199.109.153` | 3600 |
| A | `@` | `185.199.110.153` | 3600 |
| A | `@` | `185.199.111.153` | 3600 |
| CNAME | `www` | `dqdatt.github.io` | 3600 |

> **Xoá các bản ghi cũ trùng tên trước khi thêm**: A `@` trỏ về IP khác, CNAME `www` trỏ chỗ khác, hoặc bản ghi "chuyển hướng / parking" mặc định của nhà cung cấp. Nếu ô Host không nhận `@`, để trống. Nếu ô giá trị CNAME bắt buộc có dấu chấm cuối, ghi `dqdatt.github.io.`.

Có thể thêm IPv6 (không bắt buộc): 4 bản ghi **AAAA** `@` → `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`.

**b) Khai báo tên miền trên GitHub**: repo → **Settings → Pages → Custom domain**, nhập `thanhhaivideo.com` rồi bấm **Save**. Chờ GitHub báo "DNS check successful" (vài phút đến vài giờ, tuỳ nhà cung cấp).

**c) Bật HTTPS**: khi tick được ô **Enforce HTTPS** thì tick vào. Chứng chỉ SSL thường có sau khoảng 15 phút, chậm nhất 24 giờ.

**d) (Khuyên làm) Xác minh tên miền** để người khác không chiếm được tên miền trên GitHub: ảnh đại diện → **Settings → Pages → Add a domain** → nhập `thanhhaivideo.com` → GitHub đưa ra 1 bản ghi **TXT** (host dạng `_github-pages-challenge-Dqdatt`) → thêm bản ghi đó ở nhà cung cấp tên miền → quay lại bấm **Verify**.

Kiểm tra DNS đã trỏ đúng chưa:

```bash
dig +short thanhhaivideo.com
```

Kết quả đúng là 4 IP `185.199.10x.153`.

### 3. Cấp mã truy cập cho khách hàng

Khách **không cần tài khoản GitHub**. Chủ repo tạo một mã truy cập riêng cho khách:

1. Mở https://github.com/settings/personal-access-tokens/new
2. **Token name**: `khach-hang` · **Expiration**: ví dụ 1 năm
3. **Repository access** → **Only select repositories** → chọn `Dqdatt/thanhhaivideo`
4. **Permissions → Repository permissions**:
   - **Contents**: Read and write (bắt buộc)
   - **Actions**: Read-only (để admin hiện trạng thái cập nhật web)
5. Bấm **Generate token**, copy mã (`github_pat_…`) và gửi cho khách. Khách vào `https://thanhhaivideo.com/admin/` và dán mã để đăng nhập.

Muốn thu hồi quyền: vào https://github.com/settings/personal-access-tokens và bấm **Revoke**. Mỗi người nên có một mã riêng. Mã hết hạn thì tạo mã mới.

> Mã truy cập giống như mật khẩu: chỉ ghi được vào repo này, nhưng không được chia sẻ công khai.

---

## Chạy trên máy

Cần Node.js 18 trở lên, không cần cài thư viện nào.

```bash
npm run dev       # build vào dist/ rồi mở http://localhost:4000
```

Trang `/admin` trên máy vẫn đọc/ghi vào repo GitHub thật (theo `package.json → portfolio.repo`).

## Cấu trúc

```
content/
  content.json         ← Toàn bộ nội dung web (admin sửa file này)
  uploads/             ← Ảnh khách tải lên
lib/
  render.js            Render HTML trang web (dùng khi build và khi xem trước trong admin)
  schema.js            Chuẩn hoá & kiểm tra dữ liệu
  defaults.js          Nội dung mẫu ban đầu
  icons.js             Bộ icon SVG
public/
  css/site.css         Giao diện trang web
  js/site.js           Popup video, lọc, menu mobile, đổi theme, hiệu ứng
  js/video-utils.js    Nhận diện link video
  admin/               Trang quản trị (HTML/CSS/JS thuần)
scripts/
  build.js             Build ra dist/ (chạy trên GitHub Actions)
  serve.js             Server xem thử trên máy
.github/workflows/deploy.yml   Tự build & deploy khi có commit lên main
```

## Câu hỏi thường gặp

**Lưu rồi mà web chưa đổi?** Đợi khoảng 1 phút rồi tải lại trang bằng Ctrl/Cmd + Shift + R. Xem tiến trình ở tab **Actions** của repo.

**Upload video được không?** Không nên: GitHub giới hạn dung lượng file. Hãy đưa video lên YouTube, Vimeo hoặc Google Drive (bật chia sẻ "Bất kỳ ai có đường liên kết") rồi dán link.

**Lỡ tay xoá?** Vào **Sao lưu** trong admin, chọn phiên bản trước rồi bấm **Khôi phục**, sau đó bấm **Lưu thay đổi**.
