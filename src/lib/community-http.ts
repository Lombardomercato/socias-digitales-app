import 'server-only'
import { unstable_rethrow } from 'next/navigation'
import { origenMetricasPermitido } from './metrics'
import { autorizarComunidad, ErrorComunidad, type SesionComunidad } from './community-server'

const HEADERS_COMUNIDAD = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' }
export function respuestaComunidad(datos: object, status = 200) { return Response.json(datos, { status, headers: HEADERS_COMUNIDAD }) }
function respuestaError(mensaje: string, status: number) { return respuestaComunidad({ estado: 'error', mensaje, error: mensaje }, status) }
export async function ejecutarComunidad(request: Request, mutacion: boolean, operacion: (auth: SesionComunidad) => Promise<Response>) {
  try {
    if (mutacion && !origenMetricasPermitido(request.headers.get('origin'), new URL(request.url).origin, request.headers.get('host'))) return respuestaError('Origen no permitido.', 403)
    const auth = await autorizarComunidad()
    if ('error' in auth) return respuestaError(auth.error.mensaje, auth.error.status)
    return await operacion(auth)
  } catch (error) {
    unstable_rethrow(error)
    if (error instanceof ErrorComunidad) return respuestaError(error.message, error.status)
    return respuestaError('No pudimos confirmar la operación. Tus cambios se conservan; volvé a intentar.', 503)
  }
}
export async function leerJsonComunidad(request: Request): Promise<unknown> {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new ErrorComunidad(415, 'El mensaje debe enviarse como JSON.')
  const limite = 16 * 1024, declarado = request.headers.get('content-length')
  if (declarado !== null && (!/^\d+$/.test(declarado) || Number(declarado) > limite)) throw new ErrorComunidad(413, 'El mensaje es demasiado grande.')
  if (!request.body) throw new ErrorComunidad(400, 'Revisá el mensaje antes de enviarlo.')
  const lector = request.body.getReader(), partes: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const parte = await lector.read()
      if (parte.done) break
      total += parte.value.byteLength
      if (total > limite) { await lector.cancel(); throw new ErrorComunidad(413, 'El mensaje es demasiado grande.') }
      partes.push(parte.value)
    }
    const bytes = new Uint8Array(total)
    let indice = 0
    for (const parte of partes) { bytes.set(parte, indice); indice += parte.byteLength }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  } catch (error) {
    if (error instanceof ErrorComunidad) throw error
    throw new ErrorComunidad(400, 'Revisá el mensaje antes de enviarlo.')
  } finally { lector.releaseLock() }
}
export function validarEntradaComunidad<T>(operacion: () => T): T {
  try { return operacion() } catch (error) { throw new ErrorComunidad(400, error instanceof Error ? error.message : 'Revisá el mensaje antes de enviarlo.') }
}
export function sinParametrosComunidad(request: Request) {
  if ([...new URL(request.url).searchParams.keys()].length) throw new ErrorComunidad(400, 'El envío contiene parámetros no permitidos.')
}
