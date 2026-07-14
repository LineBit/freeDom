const RATE_LIMIT = 5;
const DEEPSEEK_KEY = DEEPSEEK_API_KEY;

// In-memory rate limit (resets on cold start, acceptable for free tier)
const rateMap = new Map();

export default {
  async fetch(request, env, ctx) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json", ...cors } });

    // Rate limit by IP
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const today = new Date().toISOString().slice(0, 10);
    const key = ip + "_" + today;
    const now = Date.now();

    // Clean old entries every 100 requests
    if (rateMap.size > 100) {
      const cutoff = now - 86400000;
      for (const [k, v] of rateMap) if (v.ts < cutoff) rateMap.delete(k);
    }

    const record = rateMap.get(key) || { count: 0, ts: now };
    if (record.count >= RATE_LIMIT) {
      return new Response(JSON.stringify({ error: "今日免费次数已用完（" + RATE_LIMIT + "次），加微信 Zhanzhang091645 解锁无限使用", remaining: 0 }), {
        status: 429,
        headers: { "Content-Type": "application/json", "X-RateLimit-Remaining": "0", ...cors }
      });
    }

    let body;
    try { body = await request.json(); } catch { return new Response(JSON.stringify({ error: "无效的请求格式" }), { status: 400, headers: { "Content-Type": "application/json", ...cors } }); }

    const { system, user } = body;
    if (!user) return new Response(JSON.stringify({ error: "缺少 user 参数" }), { status: 400, headers: { "Content-Type": "application/json", ...cors } });

    const apiKey = env.DEEPSEEK_API_KEY || DEEPSEEK_KEY;
    if (!apiKey) return new Response(JSON.stringify({ error: "服务器配置错误" }), { status: 500, headers: { "Content-Type": "application/json", ...cors } });

    try {
      const resp = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + apiKey
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: system || "" },
            { role: "user", content: user }
          ],
          temperature: 0.85,
          max_tokens: 3072
        })
      });

      if (!resp.ok) {
        const errText = await resp.text();
        return new Response(JSON.stringify({ error: "DeepSeek API 错误 (" + resp.status + "): " + errText.slice(0, 200) }), {
          status: resp.status,
          headers: { "Content-Type": "application/json", ...cors }
        });
      }

      const data = await resp.json();
      record.count += 1;
      record.ts = now;
      rateMap.set(key, record);
      const remaining = RATE_LIMIT - record.count;

      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json", "X-RateLimit-Remaining": String(remaining), ...cors }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: "服务器错误: " + err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...cors }
      });
    }
  }
};
