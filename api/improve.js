export default async function handler(req, res) {
  // CORS for local dev
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { text, fieldType } = req.body || {}
  if (!text?.trim()) return res.status(400).json({ error: 'No text provided' })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Clave de IA no configurada. Contacta al administrador.' })
  }

  const prompts = {
    observaciones: `Eres una fisioterapeuta domiciliaria experta con lenguaje clínico formal colombiano. Mejora la redacción de estas observaciones clínicas: hazlas más precisas, con terminología fisioterapéutica adecuada y en tercera persona. Conserva TODA la información original, solo mejora el estilo y la terminología. Responde únicamente con el texto mejorado, sin explicaciones ni encabezados:\n\n${text}`,
    intervencion: `Eres una fisioterapeuta domiciliaria experta con lenguaje clínico formal colombiano. Mejora la redacción de esta descripción de intervención fisioterapéutica: hazla más técnica, organizada y formal. Conserva TODA la información original, solo mejora el estilo y la terminología. Responde únicamente con el texto mejorado, sin explicaciones ni encabezados:\n\n${text}`,
  }

  const prompt = prompts[fieldType] || prompts.observaciones

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.25, maxOutputTokens: 500 },
        }),
      }
    )

    if (!response.ok) {
      const errText = await response.text()
      console.error('Gemini API error:', response.status, errText)
      // Parse Gemini error message for better UX
      let geminiMsg = ''
      try { geminiMsg = JSON.parse(errText)?.error?.message || '' } catch (_) {}
      return res.status(502).json({ error: `Error Gemini ${response.status}: ${geminiMsg || errText.slice(0, 200)}` })
    }

    const data = await response.json()
    const improved = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!improved) {
      return res.status(500).json({ error: 'La IA no devolvió una respuesta válida.' })
    }

    return res.status(200).json({ improved: improved.trim() })
  } catch (err) {
    console.error('improve handler error:', err)
    return res.status(500).json({ error: 'Error interno del servidor.' })
  }
}
