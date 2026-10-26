// Vercel Serverless — Automatic WhatsApp (Meta Cloud API)
// Vercel Dashboard → Settings → Environment Variables me lagayein:
// WHATSAPP_TOKEN = aapka Meta permanent access token
// WHATSAPP_PHONE_ID = aapka Phone Number ID (Meta dashboard se)
// TEMPLATE_NAME = approved template ka naam (optional, default: bill_reminder)

export default async function handler(req, res) {
  // GET = status check (frontend Automatic ON/OFF ke liye)
  if (req.method === 'GET') {
    const ok = !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);
    return res.status(ok ? 200 : 503).json({ ok, mode: ok ? 'automatic' : 'manual' });
  }
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST only' });

  try {
    const { to, message, isp, customer } = req.body || {};
    if (!to || !message) return res.status(400).json({ ok: false, error: 'to + message zaroori' });

    const TOKEN = process.env.WHATSAPP_TOKEN;
    const PHONE_ID = process.env.WHATSAPP_PHONE_ID;
    if (!TOKEN || !PHONE_ID) {
      // Backend abhi connect nahi — frontend khud wa.me khol lega
      return res.status(503).json({ ok: false, error: 'API not configured', fallback: true });
    }

    // Pakistan numbers: 92 se shuru, bina + ke
    let dest = String(to).replace(/\D/g, '');
    if (dest.startsWith('0')) dest = '92' + dest.slice(1);

    // Option A: simple text (test numbers ke liye). 24h window ke bahar template chahye hoga.
    const url = `https://graph.facebook.com/v21.0/${PHONE_ID}/messages`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: dest,
        type: 'text',
        text: { preview_url: false, body: String(message).slice(0, 4000) }
      })
    });
    const data = await resp.json();
    if (!resp.ok) {
      return res.status(502).json({ ok: false, error: data?.error?.message || 'Meta API error', detail: data });
    }
    return res.status(200).json({ ok: true, id: data?.messages?.[0]?.id || null, to: dest, isp: isp || '', customer: customer || '' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
