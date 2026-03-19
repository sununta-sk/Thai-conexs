import 'dotenv/config';
import express from "express";
import cors from "cors";
import notificationRoutes from "./routes/notifications"; // ✅ ย้ายมาบนสุด

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

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

// ── GET /api/health ───────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, project: "DowndaRoad Media", time: new Date().toISOString() });
});

// ── POST /api/auth/login ──────────────────────────────────────────────────
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ ok: false, message: "Email & password required" });
  }
  return res.json({ ok: true, token: "demo-token-123", user: { email } });
});

// ── POST /api/translate ───────────────────────────────────────────────────
app.post("/api/translate", async (req, res) => {
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
});

// ── POST /api/face-verify ─────────────────────────────────────────────────
app.post("/api/face-verify", async (req, res) => {
  const { imageBase64, mimeType } = req.body || {};

  if (!imageBase64) {
    return res.status(400).json({ pass: false, reason: "ไม่พบรูปภาพ" });
  }

  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY ไม่ได้ตั้งค่าใน .env" });
  }

  try {
    const data = await callClaude("claude-sonnet-4-20250514", {
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mimeType || "image/jpeg", data: imageBase64 },
          },
          {
            type: "text",
            text: `You are a face verification AI for a dating app. Analyze this image and respond ONLY with a JSON object (no markdown, no explanation).

Check:
1. Is there a real human face clearly visible?
2. Is it a live person (not a photo of a photo, not AI-generated, not heavily filtered)?
3. Is the face clear enough to identify?

Respond with exactly:
{"pass": true/false, "reason": "brief reason in Thai (1 sentence max)"}`,
          },
        ],
      }],
    }) as any;

    const text = data.content?.map((c: any) => c.text || "").join("") || "";
    let result: { pass: boolean; reason: string };
    try {
      result = JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch {
      result = { pass: false, reason: "ไม่สามารถวิเคราะห์รูปภาพได้ กรุณาลองใหม่" };
    }

    return res.json(result);
  } catch (err: any) {
    console.error("[face-verify]", err.message);
    return res.status(500).json({ pass: false, reason: "เกิดข้อผิดพลาด: " + err.message });
  }
});

// ── Notification Routes ───────────────────────────────────────────────────
app.use("/api/notifications", notificationRoutes); // ✅ ก่อน listen

// ── Start ─────────────────────────────────────────────────────────────────
app.listen(4000, () => {
  console.log("API running on http://localhost:4000");
});