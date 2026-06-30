// api/face-verify.ts — Vercel serverless function
// ตรวจสอบใบหน้าด้วย Claude Sonnet vision ผ่าน Anthropic API

export const config = { runtime: 'nodejs' };

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

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
}
