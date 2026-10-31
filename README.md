# Portfolio cho Video Editor

Portfolio cho video editor theo dạng **trang chủ + trang riêng cho từng dự án**: web tĩnh trên **GitHub Pages**, nội dung (chữ, link video), hình ảnh và video lưu trên **Supabase**. Có trang **`/admin`** (đăng nhập bằng 1 tài khoản đơn giản: tên `admin` và mật khẩu) để tự thêm dự án, sửa nội dung, sắp xếp bố cục và đọc tin nhắn liên hệ.

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

**Trang chủ**
- **Showreel**: khung video lớn với tiêu đề, nút ▶ phát ngay trong khung (video tải lên thì tự chạy nền không tiếng)
- **Giới thiệu & chỉ số**: ảnh chân dung, SĐT, email, nút liên hệ, mạng xã hội, các con số (5+ năm kinh nghiệm, 120+ dự án…)
- **Lưới dự án** có bộ lọc danh mục; bấm vào thẻ để mở trang dự án
- **Behind the scenes**: ảnh timeline dựng phim, **thanh kéo so sánh màu trước/sau** (LOG → color grade), **đa định dạng** (16:9, 9:16, 1:1…), ảnh on-set / VFX & sound breakdown theo nhóm
- **Liên hệ & hợp tác**: form gửi tin nhắn (lưu vào Supabase) + địa chỉ, email, điện thoại

**Trang dự án** (`/du-an/<tên-dự-án>/`)
- Trình phát video chính + thông tin dự án (khách hàng, vai trò, phần mềm, thiết bị, năm, mô tả); mục nào để trống thì tự ẩn
- Nút **Dự án tiếp theo**

**Chung**
- Hỗ trợ link **YouTube (cả Shorts), Vimeo, Google Drive, TikTok, Facebook** và **video tải lên (.mp4/.webm/.mov)**, ảnh bìa lấy tự động
- Responsive trên điện thoại; **giao diện sáng / tối / tự động theo thiết bị**, có nút ☀/☾ để người xem tự đổi

**Trang quản trị**
- Menu xếp theo các khối của trang chủ: **Showreel**, **Giới thiệu**, **Dự án & danh mục**, **Hậu trường**, **Liên hệ**; mỗi khối một tab, ảnh hiện xem trước lớn đúng khung như trên trang
- **Dự án & danh mục**: thêm / đổi tên / xoá / kéo thả sắp xếp danh mục (thứ tự nút lọc trên trang chủ); dán link hoặc tải file video lên; tự nhận diện nền tảng và lấy tiêu đề; kéo thả sắp xếp dự án; ẩn/hiện; ảnh bìa riêng; thông tin dự án; khung xem trước hiện ngay trang của dự án đang sửa
- **Bố cục & menu**: kéo thả đổi thứ tự khối; bật/tắt, thêm, nhân bản, xoá khối; tên trên menu; số cột; tỉ lệ ảnh
- **Tin nhắn**: tin nhắn khách gửi từ form liên hệ, đánh dấu đã đọc, trả lời qua email, xoá
- **Cài đặt**: logo, favicon, chế độ sáng/tối, màu, font, liên hệ, mạng xã hội, SEO
- **Thư viện file**: ảnh và video trên Supabase Storage
- **Tài khoản**: đổi mật khẩu, đăng xuất
- **Sao lưu**: 50 phiên bản gần nhất, khôi phục 1 click, xuất/nhập file JSON

Nội dung theo bố cục cũ (Banner, Dịch vụ, Đánh giá, Đối tác…) được tự chuyển sang bố cục mới khi mở trang; khối Dịch vụ, Đánh giá và Đối tác được bỏ đi. Bấm **Lưu** trong admin một lần để ghi bố cục mới vào database.

---

## Cài đặt lần đầu (chủ dự án làm 1 lần)

### 1. Thiết lập Supabase

Project: `kgnflmnwkmxuvbqjphjc`. Cấu hình kết nối nằm trong `package.json → portfolio`.

> Chỉ **publishable key** (`sb_publishable_…`) được để trong code; key này công khai theo thiết kế, dữ liệu được bảo vệ bằng RLS. **Không bao giờ** đưa **secret key** (`sb_secret_…`) vào code hay repo.

**a) Tạo bảng, phân quyền, kho file, bảng tin nhắn liên hệ**: chạy file [`supabase/setup.sql`](supabase/setup.sql). Chạy lại nhiều lần cũng an toàn, không mất dữ liệu. Khi file này có thêm bảng mới (ví dụ `contact_messages` cho form liên hệ), chạy lại một lần.

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

Muốn xem giao diện với nội dung mẫu (có đủ ảnh mẫu cho khối Behind the scenes) mà không đụng tới Supabase:

```bash
npm run dev:local # build từ content/content.json, trang không tự tải nội dung từ Supabase
```

## Cấu trúc

```
supabase/
  setup.sql            ← Chạy 1 lần trong Supabase SQL Editor (bảng, RLS, storage, nội dung ban đầu)
content/
  content.json         Nội dung dự phòng (dùng khi chưa kết nối được Supabase)
lib/
  render.js            Render HTML trang chủ & trang dự án (dùng khi build, khi xem trước và khi trang tự cập nhật)
  schema.js            Chuẩn hoá & kiểm tra dữ liệu, tự chuyển nội dung bố cục cũ sang bố cục mới
  defaults.js          Nội dung mẫu ban đầu
  icons.js             Bộ icon SVG
public/
  css/site.css         Giao diện trang web
  js/site.js           Phát video, lọc, so sánh màu, form liên hệ, menu mobile, đổi theme, tải nội dung mới từ Supabase
  js/video-utils.js    Nhận diện link video
  admin/               Trang quản trị (HTML/CSS/JS thuần)
scripts/
  build.js             Build ra dist/: trang chủ, du-an/<slug>/ cho từng dự án, 404.html
                       (dự án thêm sau lần build gần nhất vẫn mở được nhờ 404.html đọc Supabase)
  serve.js             Server xem thử trên máy
.github/workflows/deploy.yml   Tự build & deploy khi có commit lên main và mỗi 6 giờ
```

## Câu hỏi thường gặp

**Form liên hệ gửi đi đâu?** Vào bảng `contact_messages` trên Supabase, xem trong tab **Tin nhắn** của admin. Nếu chưa chạy lại `supabase/setup.sql` (chưa có bảng) hoặc mất mạng, nút Gửi sẽ mở ứng dụng email của khách với nội dung đã điền sẵn.

**Lưu rồi mà web chưa đổi?** Tải lại trang bằng Ctrl/Cmd + Shift + R. Web luôn hỏi Supabase bản mới nhất mỗi lần mở.

**Upload video được không?** Được, tối đa 50MB/file (giới hạn gói Supabase miễn phí, tổng dung lượng 1GB). Video dài hoặc chất lượng cao nên đưa lên YouTube/Vimeo rồi dán link: tiết kiệm dung lượng và phát mượt hơn.

**Lỡ tay xoá?** Vào **Sao lưu** trong admin, chọn phiên bản trước rồi bấm **Khôi phục**, sau đó bấm **Lưu thay đổi**.

**Quên mật khẩu?** Vào Supabase → **Authentication → Users**, bấm vào `admin@thanhhaivideo.com` để đặt mật khẩu mới.

**Supabase project bị tạm dừng?** Gói miễn phí tạm dừng project sau 7 ngày không có truy cập vào database. Web vẫn hiện bản HTML build sẵn (GitHub Actions gọi Supabase mỗi 6 giờ, nên thường giữ project hoạt động); nếu bị dừng, vào Supabase bấm **Restore project**.
