/**
 * Groq API client — OpenAI-compatible interface.
 * Used for the RAG methodology assistant (Session 9).
 * Switch to Claude later by replacing GROQ_API_KEY + endpoint.
 */

const GROQ_BASE  = 'https://api.groq.com/openai/v1'
const GROQ_MODEL = 'llama-3.3-70b-versatile'

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// ─── Non-streaming completion ─────────────────────────────────────────────────

export async function groqComplete(
  messages: GroqMessage[],
  opts?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model:       GROQ_MODEL,
      messages,
      max_tokens:  opts?.maxTokens  ?? 1024,
      temperature: opts?.temperature ?? 0.3,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

// ─── Streaming completion → returns ReadableStream ───────────────────────────

export function groqStream(
  messages: GroqMessage[],
  opts?: { maxTokens?: number; temperature?: number }
): Promise<ReadableStream<Uint8Array>> {
  return fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model:       GROQ_MODEL,
      messages,
      max_tokens:  opts?.maxTokens  ?? 2048,
      temperature: opts?.temperature ?? 0.3,
      stream:      true,
    }),
  }).then(res => {
    if (!res.ok) throw new Error(`Groq API error ${res.status}`)
    if (!res.body) throw new Error('No response body from Groq')
    return res.body
  })
}
