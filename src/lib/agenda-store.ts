import 'server-only'
import { pedirR2 } from './r2-upload'
import { HITO_INICIAL, validarHito, type HitoEditable } from './agenda-management'

// Configuración privada: no usar configuracion (tiene lectura anónima).
// Objeto independiente de los archivos de clases; nunca se entrega su URL.
const CLAVE = 'plataforma/agenda-v1.json'
const LIMITE = 16_000
export class ConflictoAgenda extends Error {}
export interface AgendaGuardada { hito: HitoEditable; revision: string | null; actualizado: string | null }

export async function leerAgenda(): Promise<AgendaGuardada> {
  const response = await pedirR2('GET', CLAVE)
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
  const revision = response.headers.get('etag')
  if (!revision) throw new Error('No pudimos verificar la versión de la agenda.')
  return { hito, revision, actualizado: x.actualizado }
}

export async function guardarAgenda(hito: HitoEditable, revision: string | null, administradora: string) {
  if (revision !== null && (typeof revision !== 'string' || !/^"[a-f0-9-]{1,100}"$/i.test(revision)))
    throw new ConflictoAgenda('Recargá la agenda antes de guardar.')
  const actualizado = new Date().toISOString()
  const body = JSON.stringify({ version: 1, hito, actualizado, administradora })
  const response = await pedirR2('PUT', CLAVE, {}, body, 'application/json',
    revision ? { 'If-Match': revision } : { 'If-None-Match': '*' })
  if (response.status === 412 || response.status === 409)
    throw new ConflictoAgenda('Otra administradora modificó la agenda. Recargá antes de guardar; tus cambios siguen en el formulario.')
  if (!response.ok) throw new Error('No pudimos guardar. Recargá para comprobar el estado antes de reintentar.')
  // Lectura real tras escritura: no afirmar éxito solo por enviar el pedido.
  const guardada = await leerAgenda()
  if (JSON.stringify(guardada.hito) !== JSON.stringify(hito))
    throw new ConflictoAgenda('La agenda cambió mientras guardabas. Recargá para revisar la última versión.')
  return guardada
}
