-- =====================================================================
-- Thiết lập Supabase cho Portfolio (chạy 1 lần trong Supabase → SQL Editor)
-- Chạy lại nhiều lần cũng an toàn (không mất dữ liệu đã có).
--
-- Sau khi chạy: vào https://thanhhaivideo.com/admin/ bấm "Tạo mã root" để lấy
-- mã quản trị đầu tiên (chỉ làm được 1 lần, khi chưa có mã root nào).
-- =====================================================================

-- 1. Nội dung trang web (chỉ 1 dòng, id = 1)
create table if not exists public.site_content (
  id int primary key default 1 check (id = 1),
  content jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text
);

-- 2. Lịch sử: mỗi lần lưu, bản trước được giữ lại (tối đa 50 bản)
create table if not exists public.site_content_history (
  id bigint generated always as identity primary key,
  content jsonb not null,
  created_at timestamptz not null default now(),
  created_by text
);

-- 3. Mã quản trị: mỗi mã ứng với 1 tài khoản ẩn (email dạng key-xxxx@...)
--    root: toàn quyền + tạo/thu hồi mã | admin: sửa nội dung
--    Xoá dòng ở bảng này = thu hồi mã ngay lập tức.
create table if not exists public.portfolio_admins (
  email text primary key check (email = lower(email)),
  role text not null default 'admin' check (role in ('root', 'admin')),
  created_at timestamptz not null default now()
);
alter table public.portfolio_admins add column if not exists label text;

create or replace function public.is_portfolio_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.portfolio_admins where email = lower(auth.jwt() ->> 'email'));
$$;

create or replace function public.is_portfolio_root() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.portfolio_admins where email = lower(auth.jwt() ->> 'email') and role = 'root');
$$;

-- Cần tạo mã root lần đầu không?
create or replace function public.portfolio_needs_setup() returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.portfolio_admins where role = 'root');
$$;

-- Nhận quyền root cho tài khoản đang đăng nhập — chỉ được khi chưa có root nào
create or replace function public.portfolio_claim_root(p_label text default 'Chủ website') returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Cần đăng nhập'; end if;
  if exists (select 1 from public.portfolio_admins where role = 'root') then
    raise exception 'Đã có mã root, không thể tạo thêm theo cách này';
  end if;
  insert into public.portfolio_admins (email, role, label)
  values (lower(auth.jwt() ->> 'email'), 'root', left(coalesce(p_label, 'Chủ website'), 60));
end $$;

-- Tự lưu lịch sử + ghi thời gian, người sửa mỗi khi cập nhật
create or replace function public.site_content_on_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.site_content_history (content, created_at, created_by)
  values (old.content, old.updated_at, old.updated_by);
  delete from public.site_content_history
  where id in (select id from public.site_content_history order by id desc offset 50);
  new.updated_at := now();
  new.updated_by := coalesce(auth.jwt() ->> 'email', new.updated_by);
  return new;
end $$;

drop trigger if exists site_content_on_update on public.site_content;
create trigger site_content_on_update before update on public.site_content
for each row execute function public.site_content_on_update();

-- 4. Phân quyền (Row Level Security)
alter table public.site_content enable row level security;
alter table public.site_content_history enable row level security;
alter table public.portfolio_admins enable row level security;

drop policy if exists "Mọi người xem nội dung" on public.site_content;
create policy "Mọi người xem nội dung" on public.site_content
  for select to anon, authenticated using (true);
drop policy if exists "Admin sửa nội dung" on public.site_content;
create policy "Admin sửa nội dung" on public.site_content
  for update to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());
drop policy if exists "Admin tạo nội dung" on public.site_content;
create policy "Admin tạo nội dung" on public.site_content
  for insert to authenticated with check (public.is_portfolio_admin());

drop policy if exists "Admin xem lịch sử" on public.site_content_history;
create policy "Admin xem lịch sử" on public.site_content_history
  for select to authenticated using (public.is_portfolio_admin());

drop policy if exists "Admin xem danh sách" on public.portfolio_admins;
create policy "Admin xem danh sách" on public.portfolio_admins
  for select to authenticated using (public.is_portfolio_admin());
drop policy if exists "Root thêm admin" on public.portfolio_admins;
create policy "Root thêm admin" on public.portfolio_admins
  for insert to authenticated with check (public.is_portfolio_root());
drop policy if exists "Root sửa admin" on public.portfolio_admins;
create policy "Root sửa admin" on public.portfolio_admins
  for update to authenticated using (public.is_portfolio_root()) with check (public.is_portfolio_root());
drop policy if exists "Root xoá admin" on public.portfolio_admins;
create policy "Root xoá admin" on public.portfolio_admins
  for delete to authenticated using (public.is_portfolio_root());

grant select on public.site_content to anon, authenticated;
grant insert, update on public.site_content to authenticated;
grant select on public.site_content_history to authenticated;
grant select, insert, update, delete on public.portfolio_admins to authenticated;
grant execute on function public.is_portfolio_admin() to anon, authenticated;
grant execute on function public.is_portfolio_root() to anon, authenticated;
grant execute on function public.portfolio_needs_setup() to anon, authenticated;
revoke execute on function public.portfolio_claim_root(text) from public, anon;
grant execute on function public.portfolio_claim_root(text) to authenticated;

-- 5. Kho ảnh/video (công khai để web hiển thị, chỉ admin được tải lên/xoá)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio', 'portfolio', true, 52428800, array[
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/x-icon', 'image/vnd.microsoft.icon',
  'video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admin xem file portfolio" on storage.objects;
create policy "Admin xem file portfolio" on storage.objects
  for select to authenticated using (bucket_id = 'portfolio' and public.is_portfolio_admin());
drop policy if exists "Admin tải file portfolio" on storage.objects;
create policy "Admin tải file portfolio" on storage.objects
  for insert to authenticated with check (bucket_id = 'portfolio' and public.is_portfolio_admin());
drop policy if exists "Admin sửa file portfolio" on storage.objects;
create policy "Admin sửa file portfolio" on storage.objects
  for update to authenticated using (bucket_id = 'portfolio' and public.is_portfolio_admin());
drop policy if exists "Admin xoá file portfolio" on storage.objects;
create policy "Admin xoá file portfolio" on storage.objects
  for delete to authenticated using (bucket_id = 'portfolio' and public.is_portfolio_admin());

-- 6. Nội dung ban đầu (chỉ thêm khi bảng còn trống)
insert into public.site_content (id, content, updated_by)
values (1, $seed${
  "settings": {
    "siteName": "Thanh Hải Video",
    "logoText": "THANHHAI",
    "logoSub": "STUDIO",
    "logoImage": "",
    "favicon": "",
    "metaTitle": "Thanh Hải Video — Video Editor & Videographer",
    "metaDescription": "Dựng phim, quay phim sự kiện, TVC, video thương hiệu và nội dung mạng xã hội.",
    "ogImage": "",
    "theme": "dark",
    "themeToggle": true,
    "accentColor": "#ff9f1c",
    "backgroundColor": "#07070b",
    "lightBackgroundColor": "#f6f5f2",
    "headingFont": "Montserrat",
    "contactButtonText": "Liên hệ",
    "contactButtonLink": "#contact",
    "email": "hello@example.com",
    "phone": "0900 000 000",
    "address": "TP. Hồ Chí Minh",
    "socials": {
      "facebook": "https://facebook.com/",
      "youtube": "https://youtube.com/",
      "instagram": "",
      "tiktok": "",
      "zalo": ""
    },
    "footerText": "© {year} Thanh Hải Video. All rights reserved."
  },
  "sections": [
    {
      "id": "hero",
      "type": "hero",
      "enabled": true,
      "navLabel": "Trang chủ",
      "data": {
        "titleLines": [
          "Next Level",
          "Amazing",
          "Videographer"
        ],
        "buttonText": "Xem thêm",
        "buttonLink": "#portfolio",
        "showreelUrl": "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
        "image": "https://images.unsplash.com/photo-1601506521937-0121a7fc2a6b?w=1400&q=80&auto=format&fit=crop",
        "imagePosition": "right"
      }
    },
    {
      "id": "services",
      "type": "services",
      "enabled": true,
      "navLabel": "",
      "data": {
        "intro": "Supporting Digital Business\nBranding Agencies\nPrivate Documentaries",
        "items": [
          {
            "icon": "film",
            "title": "Video Editing"
          },
          {
            "icon": "users",
            "title": "Cameraman"
          },
          {
            "icon": "camera",
            "title": "Videography"
          },
          {
            "icon": "tag",
            "title": "Branding"
          }
        ]
      }
    },
    {
      "id": "about",
      "type": "about",
      "enabled": true,
      "navLabel": "Giới thiệu",
      "data": {
        "eyebrow": "Về chúng tôi",
        "title": "We Always Make The Best",
        "text": "Hơn 5 năm kinh nghiệm dựng phim và quay phim cho thương hiệu, sự kiện và nhà sáng tạo nội dung. Mỗi khung hình đều được chăm chút để kể câu chuyện của bạn một cách cuốn hút nhất.",
        "buttonText": "Liên hệ ngay",
        "buttonLink": "#contact",
        "image": "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=1000&q=80&auto=format&fit=crop",
        "imagePosition": "left"
      }
    },
    {
      "id": "portfolio",
      "type": "portfolio",
      "enabled": true,
      "navLabel": "Portfolio",
      "data": {
        "eyebrow": "Our Portfolio",
        "title": "Latest Work",
        "columns": 3,
        "aspect": "4:3",
        "showFilter": true,
        "category": "",
        "limit": 0
      }
    },
    {
      "id": "reviews",
      "type": "reviews",
      "enabled": true,
      "navLabel": "Đánh giá",
      "data": {
        "title": "About 1000+ Positive Review",
        "rating": 5,
        "items": [
          {
            "name": "Minh Anh",
            "role": "Marketing Manager",
            "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80&auto=format&fit=crop",
            "text": "Video ra mắt sản phẩm vượt mong đợi, đúng deadline và cực kỳ chuyên nghiệp.",
            "rating": 5
          },
          {
            "name": "Quốc Bảo",
            "role": "YouTuber",
            "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80&auto=format&fit=crop",
            "text": "Edit nhanh, bắt trend tốt, view kênh tăng rõ rệt sau khi hợp tác.",
            "rating": 5
          },
          {
            "name": "Thu Trang",
            "role": "Wedding Planner",
            "avatar": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80&auto=format&fit=crop",
            "text": "Phim cưới cảm xúc, màu đẹp, cô dâu chú rể xem xong đều khóc.",
            "rating": 5
          },
          {
            "name": "Hoàng Long",
            "role": "Founder, Startup",
            "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80&auto=format&fit=crop",
            "text": "Hiểu brief nhanh, góp ý sáng tạo và chỉnh sửa rất nhiệt tình.",
            "rating": 5
          },
          {
            "name": "Ngọc Hân",
            "role": "Event Organizer",
            "avatar": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80&auto=format&fit=crop",
            "text": "Quay sự kiện gọn gàng, highlight có ngay trong ngày.",
            "rating": 5
          },
          {
            "name": "Đức Huy",
            "role": "Gamer / Streamer",
            "avatar": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80&auto=format&fit=crop",
            "text": "Montage gaming cực cháy, hiệu ứng mượt.",
            "rating": 5
          }
        ]
      }
    },
    {
      "id": "contact",
      "type": "contact",
      "enabled": true,
      "navLabel": "",
      "data": {
        "eyebrow": "Hợp tác",
        "title": "Cùng tạo nên video tiếp theo",
        "text": "Gửi ý tưởng của bạn, chúng tôi sẽ phản hồi trong vòng 24 giờ.",
        "buttonText": "Gửi email"
      }
    }
  ],
  "videos": [
    {
      "id": "v1",
      "title": "New Year Festival",
      "description": "Highlight sự kiện năm mới",
      "url": "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
      "thumbnail": "",
      "category": "Sự kiện",
      "visible": true
    },
    {
      "id": "v2",
      "title": "Office Special Event",
      "description": "Year End Party công ty",
      "url": "https://www.youtube.com/watch?v=eRsGyueVLvQ",
      "thumbnail": "",
      "category": "Sự kiện",
      "visible": true
    },
    {
      "id": "v3",
      "title": "School Trip",
      "description": "Kỷ niệm dã ngoại",
      "url": "https://www.youtube.com/watch?v=R6MlUcmOul8",
      "thumbnail": "",
      "category": "Vlog",
      "visible": true
    },
    {
      "id": "v4",
      "title": "Cooking Channel",
      "description": "Series nấu ăn cho YouTube",
      "url": "https://www.youtube.com/watch?v=WhWc3b3KhnY",
      "thumbnail": "",
      "category": "YouTube",
      "visible": true
    },
    {
      "id": "v5",
      "title": "Memories Album",
      "description": "Phim kỷ niệm gia đình",
      "url": "https://www.youtube.com/watch?v=_cMxraX_5RE",
      "thumbnail": "",
      "category": "Vlog",
      "visible": true
    },
    {
      "id": "v6",
      "title": "Gaming Video",
      "description": "Montage gaming",
      "url": "https://www.youtube.com/watch?v=mN0zPOpADL4",
      "thumbnail": "",
      "category": "YouTube",
      "visible": true
    }
  ]
}$seed$::jsonb, 'setup')
on conflict (id) do nothing;
