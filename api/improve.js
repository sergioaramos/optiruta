export default async function handler(req, res) {
  // CORS for local dev
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { text, fieldType } = req.body || {}
  if (!text?.trim()) return res.status(400).json({ error: 'No text provided' })

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Clave de IA no configurada.' })
  }

  const prompts = {
    observaciones: `Eres una fisioterapeuta domiciliaria experta con lenguaje clínico formal colombiano. Mejora la redacción de estas observaciones clínicas: hazlas más precisas, con terminología fisioterapéutica adecuada y en tercera persona. Conserva TODA la información original, solo mejora el estilo y la terminología. Responde únicamente con el texto mejorado, sin explicaciones ni encabezados:\n\n${text}`,
    intervencion: `Eres una fisioterapeuta domiciliaria experta con lenguaje clínico formal colombiano. Mejora la redacción de esta descripción de intervención fisioterapéutica: hazla más técnica, organizada y formal. Conserva TODA la información original, solo mejora el estilo y la terminología. Responde únicamente con el texto mejorado, sin explicaciones ni encabezados:\n\n${text}`,
  }

  const prompt = prompts[fieldType] || prompts.observaciones

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.25,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      let msg = ''
      try { msg = JSON.parse(errText)?.error?.message || '' } catch (_) {}
      console.error('Groq error:', response.status, msg || errText)
      return res.status(502).json({ error: `Error IA (${response.status}): ${msg || 'intenta de nuevo'}` })
    }

    const data = await response.json()
    const improved = data.choices?.[0]?.message?.content
    if (!improved) return res.status(500).json({ error: 'La IA no devolvió respuesta.' })

    return res.status(200).json({ improved: improved.trim() })
  } catch (err) {
    console.error('improve handler error:', err)
    return res.status(500).json({ error: 'Error interno del servidor.' })
  }
}
