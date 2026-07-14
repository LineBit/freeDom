import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const RATE_LIMIT = 5;
const DATA_FILE = path.join(__dirname, 'usage.json');
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || 'sk-618a14a5512a4f04951f220f3483bb71';
const ALLOWED_ORIGINS = [
  'https://linebit.github.io',
  'http://localhost:5500',
  'http://127.0.0.1:5500'
];

app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json({ limit: '1mb' }));

// ---- Rate Limit Storage ----
function getUsage() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')); }
  catch { return {}; }
}

function saveUsage(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Clean old entries (older than 7 days) on startup
function cleanOldEntries() {
  const data = getUsage();
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  let cleaned = false;
  Object.keys(data).forEach(key => {
    if (now - data[key].ts > sevenDays) {
      delete data[key];
      cleaned = true;
    }
  });
  if (cleaned) saveUsage(data);
}
cleanOldEntries();

// ---- Get real client IP ----
function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  const real = req.headers['x-real-ip'];
  if (real) return real;
  return req.ip || req.socket.remoteAddress || 'unknown';
}

// ---- Health check ----
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ---- Generate endpoint ----
app.post('/api/generate', async (req, res) => {
  const ip = getClientIP(req);
  const today = new Date().toISOString().slice(0, 10);
  const key = ip + '_' + today;

  const usage = getUsage();
  const record = usage[key] || { count: 0, ts: Date.now() };

  if (record.count >= RATE_LIMIT) {
    res.set('X-RateLimit-Remaining', '0');
    res.set('X-RateLimit-Reset', '86400');
    return res.status(429).json({
      error: '今日免费次数已用完（' + RATE_LIMIT + '次），加微信 Zhanzhang091645 解锁无限使用',
      remaining: 0
    });
  }

  const { system, user, model, temperature, max_tokens } = req.body;
  if (!user) {
    return res.status(400).json({ error: '缺少 user 参数' });
  }

  try {
    const resp = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + DEEPSEEK_KEY
      },
      body: JSON.stringify({
        model: model || 'deepseek-chat',
        messages: [
          { role: 'system', content: system || '' },
          { role: 'user', content: user }
        ],
        temperature: temperature ?? 0.85,
        max_tokens: max_tokens || 3072
      })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return res.status(resp.status).json({ error: 'DeepSeek API 错误 (' + resp.status + '): ' + errText.slice(0, 200) });
    }

    const data = await resp.json();

    // Increment count
    record.count += 1;
    record.ts = Date.now();
    usage[key] = record;
    saveUsage(usage);

    const remaining = RATE_LIMIT - record.count;
    res.set('X-RateLimit-Remaining', String(remaining));
    res.set('X-RateLimit-Limit', String(RATE_LIMIT));
    res.json(data);

  } catch (err) {
    console.error('Proxy error:', err.message);
    res.status(500).json({ error: '服务器错误: ' + err.message });
  }
});

app.listen(PORT, () => {
  console.log('Backend running on port', PORT);
  console.log('Rate limit:', RATE_LIMIT, 'per day per IP');
});
