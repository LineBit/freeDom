export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const RATE_LIMIT = 5;
  const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;
  if (!DEEPSEEK_KEY) return res.status(500).json({ error: "服务器配置错误" });

  if (!handler.cache) handler.cache = new Map();
  const cache = handler.cache;
  if (cache.size > 500) { const cutoff = Date.now() - 86400000; for (const [k, v] of cache) if (v.ts < cutoff) cache.delete(k); }

  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  const today = new Date().toISOString().slice(0, 10);
  const key = ip + "_" + today;
  const rec = cache.get(key) || { count: 0, ts: Date.now() };

  if (rec.count >= RATE_LIMIT) {
    res.setHeader("X-RateLimit-Remaining", "0");
    return res.status(429).json({ error: "今日免费次数已用完（" + RATE_LIMIT + "次），加微信 Zhanzhang091645 解锁无限使用" });
  }

  const { system, user } = req.body || {};
  if (!user) return res.status(400).json({ error: "缺少 user 参数" });

  try {
    const resp = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + DEEPSEEK_KEY },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "system", content: system || "" }, { role: "user", content: user }],
        temperature: 0.85, max_tokens: 3072
      }),
      signal: AbortSignal.timeout(9000)
    });

    if (!resp.ok) { const e = await resp.text(); return res.status(resp.status).json({ error: "DeepSeek API 错误 (" + resp.status + "): " + e.slice(0, 200) }); }
    const data = await resp.json();
    rec.count++; rec.ts = Date.now(); cache.set(key, rec);
    res.setHeader("X-RateLimit-Remaining", String(RATE_LIMIT - rec.count));
    return res.json(data);
  } catch (err) {
    if (err.name === "TimeoutError") return res.status(504).json({ error: "DeepSeek 响应超时，请稍后重试" });
    return res.status(500).json({ error: "服务器错误: " + err.message });
  }
}
