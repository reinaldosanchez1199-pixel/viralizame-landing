export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ reply: 'API key no configurada.' });

  const { messages, imgBase64, system } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ reply: 'Error en los datos.' });

  const builtMessages = [];
  if (imgBase64) {
    const allButLast = messages.slice(0, -1);
    const last = messages[messages.length - 1];
    builtMessages.push(...allButLast);
    builtMessages.push({
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imgBase64 } },
        { type: 'text', text: last.content || 'Analiza mi perfil y recomiéndame el paquete ideal.' }
      ]
    });
  } else {
    builtMessages.push(...messages);
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: system || '',
        messages: builtMessages
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic error:', err);
      return res.status(200).json({ reply: 'Para asesoría personalizada escríbenos al WhatsApp: +1 (832) 516-3196 💬' });
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || 'Para asesoría personalizada escríbenos al WhatsApp: +1 (832) 516-3196 💬';
    return res.status(200).json({ reply });

  } catch (err) {
    console.error('Error:', err);
    return res.status(200).json({ reply: 'Para asesoría personalizada escríbenos al WhatsApp: +1 (832) 516-3196 💬' });
  }
}
