require('dotenv').config({ path: '.env' });
const express = require('express');
const cors = require('cors');
const { authMiddleware } = require('./middleware/auth');
const app = express();
app.use(cors());

// ⚠️ Webhook ต้อง mount ก่อน express.json()
const subscriptionRoutes = require('./routes/subscription');
app.use('/api/subscription/webhook', express.raw({ type: 'application/json' }), subscriptionRoutes);

app.use(express.json({ limit: '20mb' }));

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api/subscription', subscriptionRoutes);

const notificationRoutes = require('./routes/notifications');
app.use('/api/notifications', notificationRoutes);

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const LANG_NAMES = { th:'Thai',en:'English',zh:'Chinese (Simplified)',ja:'Japanese',ko:'Korean',fr:'French',de:'German',es:'Spanish',it:'Italian',pt:'Portuguese',ru:'Russian',ar:'Arabic',hi:'Hindi',vi:'Vietnamese',id:'Indonesian',ms:'Malay' };

async function callClaude(model, body) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST',
    headers:{'Content-Type':'application/json','x-api-key':ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
    body: JSON.stringify({ model, max_tokens:1024, ...body }),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || 'Anthropic error'); }
  return res.json();
}

app.get('/api/health', (_,res) => res.json({ ok:true }));

app.post('/api/translate', async (req,res) => {
  const { text, targetLang } = req.body || {};
  if (!text?.trim()) return res.json({ translated: text });
  try {
    const data = await callClaude('claude-haiku-4-5-20251001', { messages:[{ role:'user', content:`Translate to ${LANG_NAMES[targetLang]||'Thai'}. Return ONLY translated text.\n\nMessage: ${text}` }] });
    return res.json({ translated: data.content?.[0]?.text?.trim() || text });
  } catch(e) { return res.status(500).json({ error:e.message, translated:text }); }
});

app.post('/api/face-verify', async (req,res) => {
  const { imageBase64, mimeType } = req.body || {};
  if (!imageBase64) return res.status(400).json({ pass:false, reason:'No image' });
  try {
    const data = await callClaude('claude-sonnet-4-20250514', { messages:[{ role:'user', content:[
      { type:'image', source:{ type:'base64', media_type:mimeType||'image/jpeg', data:imageBase64 } },
      { type:'text', text:'You are a face verification AI. Respond ONLY with JSON: {"pass": true/false, "reason": "brief reason in Thai"}\n\nCheck: 1) Real human face visible? 2) Live person not photo/AI? 3) Face clear enough?' }
    ]}] });
    const text = data.content?.map(c=>c.text||'').join('') || '';
    let result;
    try { result = JSON.parse(text.replace(/```json|```/g,'').trim()); }
    catch { result = { pass:false, reason:'ไม่สามารถวิเคราะห์ได้ กรุณาลองใหม่' }; }
    return res.json(result);
  } catch(e) { return res.status(500).json({ pass:false, reason:'Error: '+e.message }); }
});

app.listen(4000, () => console.log('✅ API running on http://localhost:4000'));