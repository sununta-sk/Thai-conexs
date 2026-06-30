// api/translate.ts — Vercel serverless function
// แปลข้อความด้วย Claude Haiku ผ่าน Anthropic API

export const config = { runtime: 'nodejs' };

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

const LANG_NAMES: Record<string, string> = {
  th: "Thai",         en: "English",      zh: "Chinese (Simplified)",
  ja: "Japanese",     ko: "Korean",       fr: "French",
  de: "German",       es: "Spanish",      it: "Italian",
  pt: "Portuguese",   ru: "Russian",      ar: "Arabic",
  hi: "Hindi",        vi: "Vietnamese",   id: "Indonesian",
  ms: "Malay",
};

async function callClaude(model: string, body: object) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type":      "application/json",
      "x-api-key":         ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model, max_tokens: 1024, ...body }),
  });
  if (!res.ok) {
    const err = await res.json() as any;
    throw new Error(err.error?.message || "Anthropic API error");
  }
  return res.json();
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { text, targetLang } = req.body || {};

  if (!text?.trim()) return res.json({ translated: text });

  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY ไม่ได้ตั้งค่าใน .env" });
  }

  try {
    const langName = LANG_NAMES[targetLang] || "Thai";
    const data = await callClaude("claude-haiku-4-5-20251001", {
      messages: [{
        role: "user",
        content: `Translate the following message to ${langName}. If already in ${langName}, return as-is. Return ONLY the translated text, no explanation.\n\nMessage: ${text}`,
      }],
    }) as any;

    return res.json({ translated: data.content?.[0]?.text?.trim() || text });
  } catch (err: any) {
    console.error("[translate]", err.message);
    return res.status(500).json({ error: err.message, translated: text });
  }
}
