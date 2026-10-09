import { randomUUID } from 'node:crypto'

type Mail = { from: string; to: string[]; subject: string; html: string; text: string }

// A retry reuses the same payload and key: timeouts never intentionally send duplicates.
export async function enviarConfirmacion(mail: Mail, apiKey: string, fetcher: typeof fetch = fetch, pause: (ms: number) => Promise<void> = ms => new Promise(resolve => setTimeout(resolve, ms))) {
  const key = 'registro/' + randomUUID()
  let status = 0
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetcher('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json', 'Idempotency-Key': key },
        body: JSON.stringify(mail),
        signal: AbortSignal.timeout(12_000),
      })
      status = response.status
      if (response.ok) {
        const sent = await response.json()
        if (typeof sent.id !== 'string') throw new Error('Respuesta sin identificador')
        return { ok: true as const, messageId: sent.id, attempts: attempt + 1 }
      }
      if (response.status !== 429 && response.status < 500) break
    } catch {
      status = 0
    }
    if (attempt < 2) await pause((attempt + 1) * 1000)
  }
  return { ok: false as const, status }
}
