export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

function jsonError(res, status, code, message) {
  return res.status(status).json({ error: code, message });
}

function normalizeMessages(messages) {
  return messages.slice(-12).map((message) => ({
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: String(message.content || '').slice(0, 6000),
  }));
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return jsonError(res, 405, 'method_not_allowed', 'Método no permitido.');
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is not configured');
    return jsonError(res, 500, 'missing_api_key', 'El asistente no está configurado todavía.');
  }

  const { messages, imgBase64, system } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return jsonError(res, 400, 'invalid_messages', 'No se recibió una conversación válida.');
  }

  const builtMessages = normalizeMessages(messages);

  if (imgBase64) {
    if (typeof imgBase64 !== 'string' || imgBase64.length > 9_000_000) {
      return jsonError(res, 413, 'invalid_image', 'La imagen es demasiado grande o no es válida.');
    }

    const last = builtMessages.pop();
    builtMessages.push({
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: imgBase64,
          },
        },
        {
          type: 'text',
          text: last?.content || 'Analiza esta captura del perfil. Describe únicamente lo que puedas observar y pide los datos que falten.',
        },
      ],
    });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
        max_tokens: 900,
        system: typeof system === 'string' ? system.slice(0, 16000) : '',
        messages: builtMessages,
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      console.error('Anthropic API error', response.status, details);
      const publicMessage = response.status === 401
        ? 'La clave de Claude no es válida o fue revocada.'
        : response.status === 429
          ? 'El asistente alcanzó temporalmente su límite de uso.'
          : response.status === 404
            ? 'El modelo configurado no está disponible.'
            : 'Claude no pudo procesar la solicitud.';
      return jsonError(res, response.status, 'anthropic_error', publicMessage);
    }

    const data = await response.json();
    const reply = data.content?.find((block) => block.type === 'text')?.text;
    if (!reply) {
      return jsonError(res, 502, 'empty_response', 'Claude devolvió una respuesta vacía.');
    }

    return res.status(200).json({ reply, requestId: response.headers.get('request-id') || null });
  } catch (error) {
    console.error('Claude handler error', error);
    return jsonError(res, 502, 'connection_error', 'No fue posible conectar con Claude en este momento.');
  }
}
