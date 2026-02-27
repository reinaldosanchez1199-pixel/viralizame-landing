export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const { messages, imgBase64, system } = req.body;

  // Build messages array — inject image into last user message if present
  const builtMessages = [];
  if (imgBase64) {
    const allButLast = messages.slice(0, -1);
    const last = messages[messages.length - 1];
    builtMessages.push(...allButLast);
    builtMessages.push({
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/jpeg', data: imgBase64 }
        },
        {
          type: 'text',
          text: last.content || 'Analiza mi perfil y recomiéndame un paquete.'
        }
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
        system: system,
        messages: builtMessages
      })
    });

    const data = await response.json();
    const reply = data.content?.[0]?.text || 'Para asesoría personalizada escríbenos al WhatsApp: +1 (832) 516-3196 💬';
    return res.status(200).json({ reply });

  } catch (err) {
    console.error('Anthropic API error:', err);
    return res.status(200).json({ reply: 'Para asesoría personalizada escríbenos al WhatsApp: +1 (832) 516-3196 💬' });
  }
}
