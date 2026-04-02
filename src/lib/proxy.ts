interface GeminiRequest {
  model: string
  [key: string]: unknown
}

export async function proxyRequest(
  provider: 'claude' | 'gemini',
  request: unknown,
  apiKey: string
): Promise<unknown> {
  if (provider === 'claude') {
    return proxyClaude(request, apiKey)
  }
  return proxyGemini(request as GeminiRequest, apiKey)
}

async function proxyClaude(request: unknown, apiKey: string): Promise<unknown> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Claude API error ${res.status}: ${text}`)
  }

  return res.json()
}

async function proxyGemini(request: GeminiRequest, apiKey: string): Promise<unknown> {
  const { model, ...body } = request
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Gemini API error ${res.status}: ${text}`)
  }

  return res.json()
}
