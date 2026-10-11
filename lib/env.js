// Đọc file .env (nếu có) vào process.env. Biến đã có sẵn trong môi trường được ưu tiên.
const fs = require('fs');
const path = require('path');

exports.load = (file = path.join(__dirname, '..', '.env')) => {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    const value = m[2].replace(/^(['"])(.*)\1$/, '$2');
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
};
