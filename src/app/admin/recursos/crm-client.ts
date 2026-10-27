export const campoCrm = 'mt-2 block min-h-11 w-full min-w-0 rounded-xl border border-[#D8CFC8] bg-[#FFFDFA] px-3 py-3 text-base text-[#211C19] outline-offset-4'
const baseBotonCrm = 'inline-flex min-h-11 items-center justify-center rounded-full border px-4 py-3 text-sm font-medium disabled:opacity-50'
export const botonCrm = `${baseBotonCrm} border-[#E7DDD5] bg-[#FFFDFA] text-[#294A38]`
export const principalCrm = `${baseBotonCrm} border-[#294A38] bg-[#294A38] text-white`
export class ErrorPeticionCrm extends Error { constructor(public status: number | null, public pendiente: boolean, mensaje: string) { super(mensaje) } }
export async function pedirCrm(url: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 20000)
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, cache: 'no-store', headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers } })
    let data: unknown
    try { data = await response.json() } catch { throw new ErrorPeticionCrm(response.status, true, 'No pudimos comprobar la respuesta. Reintentá el mismo envío.') }
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new ErrorPeticionCrm(null, true, 'La respuesta no pudo comprobarse.')
    const payload = data as Record<string, unknown>
    if (!response.ok) throw new ErrorPeticionCrm(response.status, response.status >= 500, typeof payload.error === 'string' ? payload.error : typeof payload.mensaje === 'string' ? payload.mensaje : 'No pudimos completar la operación.')
    return payload
  } catch (e) { if (e instanceof ErrorPeticionCrm) throw e; throw new ErrorPeticionCrm(null, true, 'Se interrumpió la conexión. Conservamos el envío para reintentarlo.') }
  finally { clearTimeout(timeout) }
}
export function fechaCrm(valor: string) { const fecha = new Date(valor); return Number.isFinite(fecha.getTime()) ? new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Cordoba' }).format(fecha) : 'Fecha sin comprobar' }
