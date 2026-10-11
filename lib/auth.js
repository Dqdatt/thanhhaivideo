// Tài khoản & phiên đăng nhập.
// - Tài khoản "root" (của bạn - người deploy) tạo tự động từ biến môi trường ADMIN_USER / ADMIN_PASSWORD.
// - Root tạo thêm tài khoản "admin" cho khách trong /admin > Tài khoản.
// - Mật khẩu băm bằng scrypt; phiên là cookie ký HMAC (không mất khi restart server).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DATA_DIR, readJson, writeJson } = require('./store');

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SECRET_FILE = path.join(DATA_DIR, 'secret.key');
const COOKIE = 'tv_session';
const SESSION_DAYS = 14;

function getSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (!fs.existsSync(SECRET_FILE)) fs.writeFileSync(SECRET_FILE, crypto.randomBytes(48).toString('hex'), { mode: 0o600 });
  return fs.readFileSync(SECRET_FILE, 'utf8').trim();
}
const SECRET = getSecret();

/* ---------- Mật khẩu ---------- */

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(String(password), salt, 64);
  const known = Buffer.from(hash, 'hex');
  return known.length === test.length && crypto.timingSafeEqual(known, test);
}

/* ---------- Người dùng ---------- */

const loadUsers = () => readJson(USERS_FILE, []);
const saveUsers = (users) => writeJson(USERS_FILE, users);
const publicUser = (u) => ({ username: u.username, role: u.role, createdAt: u.createdAt });

function validateCredentials(username, password) {
  if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(username || '')) return 'Tên đăng nhập 3-32 ký tự (chữ, số, _ . -)';
  if (typeof password !== 'string' || password.length < 8) return 'Mật khẩu tối thiểu 8 ký tự';
  return null;
}

function ensureRootUser() {
  const users = loadUsers();
  if (users.some((u) => u.role === 'root')) return;
  const username = process.env.ADMIN_USER || 'admin';
  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    password = crypto.randomBytes(9).toString('base64url');
    console.log('\n================================================');
    console.log(' Chưa đặt ADMIN_PASSWORD, đã tạo tài khoản root:');
    console.log(`   Tên đăng nhập: ${username}`);
    console.log(`   Mật khẩu:      ${password}`);
    console.log(' Hãy đăng nhập /admin và đổi mật khẩu ngay.');
    console.log('================================================\n');
  }
  users.push({ username, role: 'root', password: hashPassword(password), pwv: 1, createdAt: new Date().toISOString() });
  saveUsers(users);
}

function createUser(username, password, role = 'admin') {
  const err = validateCredentials(username, password);
  if (err) throw new Error(err);
  const users = loadUsers();
  if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) throw new Error('Tên đăng nhập đã tồn tại');
  users.push({ username, role: role === 'root' ? 'root' : 'admin', password: hashPassword(password), pwv: 1, createdAt: new Date().toISOString() });
  saveUsers(users);
}

function deleteUser(username) {
  const users = loadUsers();
  const target = users.find((u) => u.username === username);
  if (!target) throw new Error('Không tìm thấy tài khoản');
  if (target.role === 'root' && users.filter((u) => u.role === 'root').length === 1) throw new Error('Không thể xoá tài khoản root cuối cùng');
  saveUsers(users.filter((u) => u.username !== username));
}

function setPassword(username, password) {
  if (typeof password !== 'string' || password.length < 8) throw new Error('Mật khẩu tối thiểu 8 ký tự');
  const users = loadUsers();
  const u = users.find((x) => x.username === username);
  if (!u) throw new Error('Không tìm thấy tài khoản');
  u.password = hashPassword(password);
  u.pwv = (u.pwv || 1) + 1; // làm mất hiệu lực các phiên cũ
  saveUsers(users);
  return u;
}

/* ---------- Phiên đăng nhập ---------- */

const sign = (payload) => crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');

function makeToken(user) {
  const payload = Buffer.from(JSON.stringify({ u: user.username, v: user.pwv || 1, exp: Date.now() + SESSION_DAYS * 864e5 })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function readToken(token) {
  const [payload, sig] = String(token || '').split('.');
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  let data;
  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString());
  } catch {
    return null;
  }
  if (!data.exp || data.exp < Date.now()) return null;
  const user = loadUsers().find((u) => u.username === data.u);
  if (!user || (user.pwv || 1) !== data.v) return null;
  return user;
}

function parseCookies(header) {
  const out = {};
  String(header || '').split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

function setSessionCookie(req, res, user) {
  const secure = req.secure ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=${makeToken(user)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_DAYS * 86400}${secure}`);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
}

function currentUser(req) {
  return readToken(parseCookies(req.headers.cookie)[COOKIE]);
}

function requireAuth(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Chưa đăng nhập' });
  req.user = user;
  next();
}

function requireRoot(req, res, next) {
  if (!req.user || req.user.role !== 'root') return res.status(403).json({ error: 'Chỉ tài khoản root được thực hiện' });
  next();
}

/* ---------- Chống dò mật khẩu: tối đa 10 lần sai / 15 phút / IP ---------- */

const attempts = new Map();
function loginRateLimited(ip) {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || rec.reset < now) return false;
  return rec.count >= 10;
}
function recordFailedLogin(ip) {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || rec.reset < now) attempts.set(ip, { count: 1, reset: now + 15 * 60e3 });
  else rec.count += 1;
}
const clearFailedLogins = (ip) => attempts.delete(ip);

module.exports = {
  ensureRootUser,
  loadUsers,
  publicUser,
  createUser,
  deleteUser,
  setPassword,
  verifyPassword,
  setSessionCookie,
  clearSessionCookie,
  currentUser,
  requireAuth,
  requireRoot,
  loginRateLimited,
  recordFailedLogin,
  clearFailedLogins,
};
