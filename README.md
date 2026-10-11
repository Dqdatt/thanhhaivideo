# Portfolio cho Video Editor

Trang portfolio tối giản theo phong cách "Videograph": web tĩnh trên **GitHub Pages**, nội dung (chữ, link video), hình ảnh và video lưu trên **Supabase**. Có trang **`/admin`** (đăng nhập bằng 1 tài khoản đơn giản: tên `admin` và mật khẩu) để tự thêm video, sửa nội dung và sắp xếp bố cục.

- **Trang web**: https://thanhhaivideo.com
- **Trang quản trị**: https://thanhhaivideo.com/admin/

## Cách hoạt động

```
/admin (tên đăng nhập + mật khẩu)
   │  Lưu  → bảng site_content   (Supabase Postgres, bảo vệ bằng RLS)
   │  Ảnh/video → bucket portfolio (Supabase Storage, tối đa 50MB/file)
   ▼
Người xem mở thanhhaivideo.com
   ├─ nhận ngay HTML build sẵn (nhanh, tốt cho SEO)
   └─ trang hỏi Supabase: có bản mới hơn không? → có thì hiện bản mới ngay
```

- Bấm **Lưu** là web đổi ngay, không cần build lại.
- GitHub Actions build lại HTML mỗi khi có commit và mỗi 6 giờ, để bản cho Google luôn mới.
- Mỗi lần lưu, database tự giữ bản trước (50 bản gần nhất), nên khôi phục được trong tab **Sao lưu**.

## Tính năng

**Trang web**
- Banner, Dịch vụ, Giới thiệu, Lưới video, Đánh giá, Liên hệ
- Bấm vào video để mở popup phát ngay trên trang. Hỗ trợ link **YouTube (cả Shorts), Vimeo, Google Drive, TikTok, Facebook** và **video tải lên (.mp4/.webm/.mov)**, ảnh bìa lấy tự động
- Lọc video theo danh mục, responsive trên điện thoại
- **Giao diện sáng / tối / tự động theo thiết bị**, có nút ☀/☾ để người xem tự đổi

**Trang quản trị**
- **Video**: dán link hoặc tải file video lên; tự nhận diện nền tảng và lấy tiêu đề; kéo thả sắp xếp; ẩn/hiện; danh mục; ảnh bìa riêng
- **Bố cục**: kéo thả đổi thứ tự khối; bật/tắt, thêm, nhân bản, xoá khối; số cột; tỉ lệ khung (16:9, 4:3, 1:1, 9:16)
- **Cài đặt**: logo, favicon, chế độ sáng/tối, màu, font, liên hệ, mạng xã hội, SEO
- **Thư viện file**: ảnh và video trên Supabase Storage
- **Tài khoản**: đổi mật khẩu, đăng xuất
- **Sao lưu**: 50 phiên bản gần nhất, khôi phục 1 click, xuất/nhập file JSON

---

## Cài đặt lần đầu (chủ dự án làm 1 lần)

### 1. Thiết lập Supabase

Project: `kgnflmnwkmxuvbqjphjc`. Cấu hình kết nối nằm trong `package.json → portfolio`.

> Chỉ **publishable key** (`sb_publishable_…`) được để trong code; key này công khai theo thiết kế, dữ liệu được bảo vệ bằng RLS. **Không bao giờ** đưa **secret key** (`sb_secret_…`) vào code hay repo.

**a) Tạo bảng, phân quyền, kho file** (đã làm sẵn bằng Supabase CLI): chạy file [`supabase/setup.sql`](supabase/setup.sql). Chạy lại nhiều lần cũng an toàn, không mất dữ liệu.

```bash
supabase link --project-ref kgnflmnwkmxuvbqjphjc
supabase db query --linked -f supabase/setup.sql
```

Hoặc dán file vào Supabase → **SQL Editor** → **Run**.

**b) Tạo tài khoản đăng nhập**: Supabase → **Authentication → Users → Add user → Create new user**:
- Email: `admin@thanhhaivideo.com`
- Password: mật khẩu bạn chọn
- Tick **Auto Confirm User**

Trang `/admin` đăng nhập bằng tên **`admin`** và mật khẩu đó. Không cần chỉnh thêm cài đặt nào: chỉ tài khoản có trong bảng `portfolio_admins` mới sửa được web.

### 2. Bật GitHub Pages

1. Repo → **Settings** → **Pages** → **Source**: **GitHub Actions**.
2. Tab **Actions** → chạy lại "Deploy GitHub Pages" (**Re-run all jobs** hoặc **Run workflow**).

### 3. Trỏ tên miền thanhhaivideo.com

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

### 4. Giao cho khách hàng

Gửi khách link `https://thanhhaivideo.com/admin/`, tên đăng nhập `admin` và mật khẩu. Khách tự đổi mật khẩu trong tab **Tài khoản**.

Muốn thêm một tài khoản riêng (ví dụ `khach`):
1. Tạo user `khach@thanhhaivideo.com` trong **Authentication → Users**.
2. Thêm email đó vào bảng `portfolio_admins` (**Table Editor**, hoặc chạy SQL `insert into portfolio_admins (email) values ('khach@thanhhaivideo.com');`).

Người đó đăng nhập bằng tên `khach`.

---

## Chạy trên máy

Cần Node.js 18 trở lên, không cần cài thư viện nào.

```bash
npm run dev       # build vào dist/ rồi mở http://localhost:4000
```

Trang web và `/admin` trên máy vẫn đọc/ghi vào Supabase thật (theo `package.json → portfolio`).

## Cấu trúc

```
supabase/
  setup.sql            ← Chạy 1 lần trong Supabase SQL Editor (bảng, RLS, storage, nội dung ban đầu)
content/
  content.json         Nội dung dự phòng (dùng khi chưa kết nối được Supabase)
lib/
  render.js            Render HTML trang web (dùng khi build, khi xem trước và khi trang tự cập nhật)
  schema.js            Chuẩn hoá & kiểm tra dữ liệu
  defaults.js          Nội dung mẫu ban đầu
  icons.js             Bộ icon SVG
public/
  css/site.css         Giao diện trang web
  js/site.js           Popup video, lọc, menu mobile, đổi theme, hiệu ứng, tải nội dung mới từ Supabase
  js/video-utils.js    Nhận diện link video
  admin/               Trang quản trị (HTML/CSS/JS thuần)
scripts/
  build.js             Build ra dist/ (chạy trên GitHub Actions, lấy nội dung từ Supabase)
  serve.js             Server xem thử trên máy
.github/workflows/deploy.yml   Tự build & deploy khi có commit lên main và mỗi 6 giờ
```

## Câu hỏi thường gặp

**Lưu rồi mà web chưa đổi?** Tải lại trang bằng Ctrl/Cmd + Shift + R. Web luôn hỏi Supabase bản mới nhất mỗi lần mở.

**Upload video được không?** Được, tối đa 50MB/file (giới hạn gói Supabase miễn phí, tổng dung lượng 1GB). Video dài hoặc chất lượng cao nên đưa lên YouTube/Vimeo rồi dán link: tiết kiệm dung lượng và phát mượt hơn.

**Lỡ tay xoá?** Vào **Sao lưu** trong admin, chọn phiên bản trước rồi bấm **Khôi phục**, sau đó bấm **Lưu thay đổi**.

**Quên mật khẩu?** Vào Supabase → **Authentication → Users**, bấm vào `admin@thanhhaivideo.com` để đặt mật khẩu mới.

**Supabase project bị tạm dừng?** Gói miễn phí tạm dừng project sau 7 ngày không có truy cập vào database. Web vẫn hiện bản HTML build sẵn (GitHub Actions gọi Supabase mỗi 6 giờ, nên thường giữ project hoạt động); nếu bị dừng, vào Supabase bấm **Restore project**.
