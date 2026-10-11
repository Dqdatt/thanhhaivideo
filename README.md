# Portfolio cho Video Editor

Trang portfolio tối giản theo phong cách "Videograph", **có trang quản trị `/admin`** để khách hàng tự thêm link video, sửa nội dung và sắp xếp lại bố cục mà không cần đụng vào code.

- **Trang public** (tên miền chính): `https://tenmien.com`
- **Trang quản trị**: `https://tenmien.com/admin`

## Tính năng

**Trang public**
- Banner, Dịch vụ, Giới thiệu, Lưới video, Đánh giá, Liên hệ (giống thiết kế mẫu)
- Bấm vào video sẽ mở popup phát ngay trên trang
- Hỗ trợ link **YouTube (cả Shorts), Vimeo, Google Drive, TikTok, Facebook, file .mp4**; ảnh bìa lấy tự động
- Lọc video theo danh mục, responsive trên điện thoại, render phía server nên tốt cho SEO
- **Giao diện sáng / tối / tự động theo thiết bị**, có nút ☀/☾ để người xem tự đổi (nhớ lựa chọn cho lần sau)

**Trang quản trị**
- **Video**: dán link là tự nhận diện nền tảng và lấy tiêu đề; kéo thả để sắp xếp; ẩn/hiện; danh mục; ảnh bìa riêng
- **Bố cục**: kéo thả đổi thứ tự khối, bật/tắt khối, thêm/nhân bản/xoá khối (có thể có nhiều lưới video, ví dụ một lưới "Wedding" và một lưới "TVC"), số cột, tỉ lệ khung (16:9, 4:3, 1:1, 9:16)
- **Thông tin & giao diện**: logo, favicon, chế độ sáng/tối, màu nhấn, màu nền (riêng cho từng chế độ), font tiêu đề, liên hệ, mạng xã hội, SEO
- **Xem trước trực tiếp** (máy tính / điện thoại) trước khi bấm Lưu
- **Thư viện file**: upload ảnh, video
- **Tài khoản**: phân quyền `root` (bạn) và `admin` (khách)
- **Sao lưu**: tự giữ 20 phiên bản gần nhất, khôi phục 1 click, xuất/nhập file JSON

## Phân quyền

| Quyền | Làm được gì |
|---|---|
| `root` | Mọi thứ, cộng thêm tạo/xoá tài khoản và đặt lại mật khẩu cho người khác |
| `admin` | Quản lý video, bố cục, thông tin, file, sao lưu, đổi mật khẩu của chính mình |

Tài khoản `root` được tạo tự động ở lần chạy đầu tiên, từ `ADMIN_USER` / `ADMIN_PASSWORD` trong file `.env`. Sau khi deploy, vào **/admin → Tài khoản → Tạo tài khoản cho khách hàng** để tạo tài khoản `admin` rồi gửi cho khách.

## Chạy trên máy

Cần Node.js 18 trở lên.

```bash
cp .env.example .env      # sửa ADMIN_PASSWORD
npm install
npm start                 # http://localhost:3000  và  http://localhost:3000/admin
```

## Cấu trúc

```
server.js              Express server + API
lib/
  store.js             Đọc/ghi dữ liệu JSON, chuẩn hoá & sao lưu
  auth.js              Tài khoản, mật khẩu (scrypt), phiên đăng nhập
  render.js            Render HTML trang public
  defaults.js          Nội dung mặc định lần chạy đầu
  icons.js             Bộ icon SVG
public/
  css/site.css         Giao diện trang public
  js/site.js           Popup video, lọc, menu mobile, hiệu ứng
  js/video-utils.js    Nhận diện link video (dùng chung server + trình duyệt)
  admin/               Trang quản trị (HTML/CSS/JS thuần, không cần build)
data/                  ← TOÀN BỘ DỮ LIỆU (nhớ sao lưu thư mục này)
  content.json         Nội dung trang
  users.json           Tài khoản
  secret.key           Khoá ký phiên đăng nhập
  uploads/             Ảnh/video đã upload
  backups/             20 bản sao lưu tự động
```

> Dữ liệu lưu bằng file nên **chỉ cần giữ thư mục `data/`** là giữ được toàn bộ website. Không cần cài database.

## Deploy

Hosting phải có **ổ đĩa lưu trữ lâu dài** (để giữ thư mục `data/`). Vì vậy **không dùng được** Vercel/Netlify (serverless, ổ đĩa bị xoá sau mỗi lần chạy).

### Cách 1: VPS + Docker (khuyên dùng)

Dùng VPS Ubuntu bất kỳ (Vultr, DigitalOcean, AZDIGI, BizFly…), 1 vCPU / 1GB RAM là đủ.

```bash
# 1. Cài Docker
curl -fsSL https://get.docker.com | sh

# 2. Đưa code lên server (git clone hoặc scp), rồi:
cd thanhhaivideo
cp .env.example .env
nano .env                       # đặt ADMIN_PASSWORD mạnh

# 3. Chạy
docker compose up -d --build
```

Trỏ tên miền và bật HTTPS bằng **Caddy** (tự xin chứng chỉ SSL):

```bash
sudo apt install -y caddy
sudo tee /etc/caddy/Caddyfile <<'EOF'
tenmien.com, www.tenmien.com {
    encode gzip
    request_body {
        max_size 250MB
    }
    reverse_proxy localhost:3000
}
EOF
sudo systemctl reload caddy
```

Ở trang quản lý tên miền, tạo bản ghi **A** cho `@` và `www` trỏ về IP của VPS.

<details>
<summary>Dùng Nginx thay cho Caddy</summary>

```nginx
server {
    server_name tenmien.com www.tenmien.com;
    client_max_body_size 250M;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Sau đó chạy `sudo certbot --nginx -d tenmien.com -d www.tenmien.com` để bật HTTPS.
</details>

### Cách 2: VPS không dùng Docker (PM2)

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs
cd thanhhaivideo && npm ci --omit=dev
cp .env.example .env && nano .env
sudo npm i -g pm2
pm2 start server.js --name portfolio
pm2 save && pm2 startup
```

### Cách 3: Render / Railway / Fly.io

- Tạo Web Service từ repo, lệnh start `npm start`
- **Bắt buộc gắn Persistent Disk / Volume** vào đường dẫn, ví dụ `/data`, và đặt biến `DATA_DIR=/data`
- Đặt các biến `ADMIN_USER`, `ADMIN_PASSWORD`, `SESSION_SECRET`

## Cập nhật code sau này

```bash
git pull
docker compose up -d --build     # hoặc: pm2 restart portfolio
```

Thư mục `data/` không bị ảnh hưởng.

## Sao lưu

- Trong /admin: **Sao lưu → Tải file sao lưu** (nội dung, không gồm file upload)
- Trên server: sao lưu nguyên thư mục `data/`, ví dụ `tar czf backup-$(date +%F).tgz data/`

## Biến môi trường

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `PORT` | `3000` | Cổng chạy |
| `ADMIN_USER` | `admin` | Tên tài khoản root tạo lần đầu |
| `ADMIN_PASSWORD` | (tự sinh, in ra log) | Mật khẩu root lần đầu |
| `SESSION_SECRET` | tự sinh trong `data/secret.key` | Khoá ký cookie đăng nhập |
| `DATA_DIR` | `./data` | Thư mục dữ liệu |
| `MAX_VIDEO_MB` | `200` | Dung lượng tối đa khi upload video |
| `TRUST_PROXY` | `loopback` | Đặt `1` nếu chạy sau proxy khác máy (Cloudflare Tunnel, Render…) |

## Quên mật khẩu root

Xoá tài khoản root trong `data/users.json` (hoặc xoá cả file), đặt `ADMIN_PASSWORD` mới trong `.env` rồi khởi động lại. Tài khoản root sẽ được tạo lại.
