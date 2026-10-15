import 'server-only'
import { pedirR2 } from './r2-upload'
import { HITO_INICIAL, validarHito, type HitoEditable } from './agenda-management'

// Configuración privada: no usar configuracion (tiene lectura anónima).
// Objeto independiente de los archivos de clases; nunca se entrega su URL.
const CLAVE = 'plataforma/agenda-v1.json'
const LIMITE = 16_000
export class ConflictoAgenda extends Error {}
export interface AgendaGuardada { hito: HitoEditable; revision: string | null; actualizado: string | null }

export function condicionRevisionAgenda(valor: unknown): string | null {
  if (valor === null) return null
  if (typeof valor !== 'string' || valor.length > 256)
    throw new ConflictoAgenda('Recargá la agenda antes de guardar.')
  // Un ETag es opaco, no necesariamente un MD5. No quitar W/ sin obtener
  // antes un validador fuerte del servidor. Exigir una sola etiqueta y rechazar
  // comodines, listas o controles que cambiarían la condición de escritura.
  if (/^(?:W\/)?"[\x21\x23-\x7e]{1,200}"$/.test(valor)) return valor
  // Algunos adaptadores devuelven el digest sin las comillas HTTP.
  if (/^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/.test(valor)) return `"${valor}"`
  throw new ConflictoAgenda('Recargá la agenda antes de guardar.')
}

export async function leerAgenda(): Promise<AgendaGuardada> {
  // Evitar la revisión W/ que Cloudflare agrega al comprimir la respuesta:
  // If-Match necesita el validador fuerte del objeto, no el de transporte.
  const response = await pedirR2('GET', CLAVE, {}, '', undefined, undefined, { sinCompresion: true })
  if (response.status === 404) return { hito: HITO_INICIAL, revision: null, actualizado: null }
  if (!response.ok) throw new Error('No pudimos leer la agenda. Intentá nuevamente.')
  if (Number(response.headers.get('content-length') || 0) > LIMITE) throw new Error('La agenda requiere revisión técnica.')
  const raw = await response.text()
  if (raw.length > LIMITE) throw new Error('La agenda requiere revisión técnica.')
  const x = JSON.parse(raw)
  if (x.version !== 1 || !x.hito || typeof x.actualizado !== 'string') throw new Error('La agenda requiere revisión técnica.')
  const h = x.hito
  if (typeof h.fecha !== 'string' || !/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:00-03:00$/.test(h.fecha)) throw new Error('La agenda requiere revisión técnica.')
  const hito = validarHito({ titulo: h.titulo, dia: h.fecha.slice(0, 10), hora: h.fecha.slice(11, 16), enlace: h.enlace ?? '', publicado: h.publicado, audiencias: h.audiencias })
  const etag = response.headers.get('etag')
  if (!etag) throw new Error('No pudimos verificar la versión de la agenda.')
  let revision = condicionRevisionAgenda(etag)
  if (revision?.startsWith('W/')) {
    const head = await pedirR2('HEAD', CLAVE, {}, '', undefined, undefined, { sinCompresion: true })
    const fuerte = head.ok ? condicionRevisionAgenda(head.headers.get('etag')) : null
    // HEAD debe pertenecer a la misma versión que el cuerpo recién leído.
    if (!fuerte || fuerte.startsWith('W/') || fuerte !== revision.slice(2))
      throw new Error('No pudimos verificar la versión de la agenda. Volvé a cargarla.')
    revision = fuerte
  }
  return { hito, revision, actualizado: x.actualizado }
}

export async function guardarAgenda(hito: HitoEditable, revision: string | null, administradora: string) {
  const condicion = condicionRevisionAgenda(revision)
  if (condicion?.startsWith('W/')) throw new ConflictoAgenda('Recargá la última versión de la agenda antes de guardar.')
  const actualizado = new Date().toISOString()
  const body = JSON.stringify({ version: 1, hito, actualizado, administradora })
  const response = await pedirR2('PUT', CLAVE, {}, body, 'application/json',
    condicion ? { 'If-Match': condicion } : { 'If-None-Match': '*' })
  if (response.status === 412 || response.status === 409)
    throw new ConflictoAgenda('Otra administradora modificó la agenda. Recargá antes de guardar; tus cambios siguen en el formulario.')
  if (!response.ok) throw new Error('No pudimos guardar. Recargá para comprobar el estado antes de reintentar.')
  // Lectura real tras escritura: no afirmar éxito solo por enviar el pedido.
  const guardada = await leerAgenda()
  if (JSON.stringify(guardada.hito) !== JSON.stringify(hito))
    throw new ConflictoAgenda('La agenda cambió mientras guardabas. Recargá para revisar la última versión.')
  return guardada
}
