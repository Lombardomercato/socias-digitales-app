export const controlComunidad = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#E7DDD5] px-4 py-2.5 text-sm font-medium text-[#294A38] transition-colors hover:border-[#294A38] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#294A38] disabled:cursor-not-allowed disabled:opacity-50'
export const accionComunidad = `${controlComunidad} border-[#294A38] bg-[#294A38] text-white hover:bg-[#203D2D]`
export const campoComunidad = 'block w-full min-w-0 resize-y rounded-[14px] border border-[#E7DDD5] bg-[#FFFDFA] px-4 py-3 text-base leading-6 text-[#211C19] focus:outline-2 focus:outline-offset-2 focus:outline-[#EC9BB6] disabled:opacity-70'

export const tiposComunidad = [
  { id: 'avance', nombre: 'Un avance', etiqueta: 'Avance', icono: 'logros' },
  { id: 'pregunta', nombre: 'Una pregunta', etiqueta: 'Pregunta', icono: 'comunidad' },
  { id: 'idea', nombre: 'Una idea', etiqueta: 'Idea', icono: 'lanzamiento' },
] as const

export function textoComunidad(texto: string) {
  return texto.normalize('NFC').replace(/\r\n?/g, '\n').trim()
}

export function fechaComunidad(fecha: string) {
  return new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Cordoba', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(fecha))
}

export class ErrorComunidad extends Error {
  constructor(public status: number | null, public pendiente: boolean) {
    super(status === 401 || status === 403 ? 'No pudimos comprobar tu acceso. Volvé a ingresar para continuar.'
      : status === 409 ? 'La publicación cambió. Actualizá la comunidad antes de volver a editarla.'
        : status === 404 ? 'Esta conversación ya no está disponible. Actualizá la comunidad.'
          : status === 400 || status === 422 ? 'Revisá el texto y volvé a intentarlo.'
            : 'No pudimos confirmar el envío. Tu texto sigue acá; reintentá el mismo envío para no duplicarlo.')
    this.name = 'ErrorComunidad'
  }
}

// A lost response does not prove a mutation failed. Callers retain the exact
// intention/UUID until the server confirms it; no optimistic content or counts.
export async function solicitarComunidad(url: string, options: { method?: string; body?: string; signal?: AbortSignal } = {}): Promise<unknown> {
  const controller = new AbortController()
  const abortar = () => controller.abort()
  options.signal?.addEventListener('abort', abortar, { once: true })
  if (options.signal?.aborted) controller.abort()
  const timer = setTimeout(abortar, 20_000)
  const escritura = Boolean(options.method && options.method !== 'GET')
  try {
    const response = await fetch(url, { ...options, cache: 'no-store', credentials: 'same-origin', signal: controller.signal, ...(escritura ? { headers: { 'Content-Type': 'application/json' } } : {}) })
    if (!response.ok) throw new ErrorComunidad(response.status, escritura && ![400, 401, 403, 404, 409, 422].includes(response.status))
    try { return await response.json() } catch { throw new ErrorComunidad(null, escritura) }
  } catch (cause) {
    if (cause instanceof ErrorComunidad) throw cause
    throw new ErrorComunidad(null, escritura)
  } finally {
    clearTimeout(timer)
    options.signal?.removeEventListener('abort', abortar)
  }
}

export function errorComunidad(cause: unknown): ErrorComunidad {
  return cause instanceof ErrorComunidad ? cause : new ErrorComunidad(null, true)
}

export function esRespuestaComunidad(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) && (value as Record<string, unknown>).ok === true)
}

export function ordenarPublicaciones<T extends { id: string; created_at: string }>(anteriores: T[], nuevas: T[]): T[] {
  const unicas = new Map(anteriores.map(item => [item.id, item]))
  for (const item of nuevas) unicas.set(item.id, item)
  return [...unicas.values()].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id))
}
