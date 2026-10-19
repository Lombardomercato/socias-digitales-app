import 'server-only'
import { pedirR2 } from './r2-upload'
import { esUuid } from './class-management'
import { validarMateriales, type MaterialClase } from './class-materials'

export class ConflictoMateriales extends Error {}
export interface MaterialesGuardados { materiales: MaterialClase[]; revision: string | null }
const LIMITE = 128_000
function clave(clase: string) {
  if (!esUuid(clase)) throw new Error('Clase no válida.')
  return `materiales-clases/${clase}/indice-v1.json`
}
export function revisionMateriales(value: unknown): string | null {
  if (value === null) return null
  if (typeof value === 'string' && /^"[\x21\x23-\x7e]{1,200}"$/.test(value)) return value
  throw new ConflictoMateriales('Recargá los materiales antes de guardar.')
}
export async function leerMateriales(clase: string): Promise<MaterialesGuardados> {
  const response = await pedirR2('GET', clave(clase), {}, '', undefined, undefined, { sinCompresion: true })
  if (response.status === 404) return { materiales: [], revision: null }
  if (!response.ok || Number(response.headers.get('content-length')) > LIMITE) throw new Error('No pudimos cargar los materiales.')
  const raw = await response.text()
  if (Buffer.byteLength(raw) > LIMITE) throw new Error('Los materiales requieren revisión.')
  const data = JSON.parse(raw)
  if (data.version !== 1) throw new Error('Los materiales requieren revisión.')
  let etag = response.headers.get('etag')
  if (etag?.startsWith('W/')) {
    const head = await pedirR2('HEAD', clave(clase), {}, '', undefined, undefined, { sinCompresion: true })
    const fuerte = head.ok ? head.headers.get('etag') : null
    if (!fuerte || fuerte.startsWith('W/') || fuerte !== etag.slice(2)) throw new Error('Recargá los materiales para verificar su versión.')
    etag = fuerte
  }
  if (!etag) throw new Error('No pudimos verificar la versión de los materiales.')
  return { materiales: validarMateriales(data.materiales), revision: revisionMateriales(etag) }
}
export async function guardarMateriales(clase: string, materiales: MaterialClase[], revision: unknown, actor: string) {
  const condicion = revisionMateriales(revision)
  const lista = validarMateriales(materiales)
  const body = JSON.stringify({ version: 1, materiales: lista, actualizado: new Date().toISOString(), administradora: actor })
  if (Buffer.byteLength(body) > LIMITE) throw new Error('Se alcanzó el límite de materiales de esta clase.')
  const response = await pedirR2('PUT', clave(clase), {}, body, 'application/json', condicion ? { 'If-Match': condicion } : { 'If-None-Match': '*' })
  if (response.status === 412 || response.status === 409) throw new ConflictoMateriales('Otra administradora cambió los materiales. Recargá la lista antes de guardar; tu formulario se conserva.')
  if (!response.ok) throw new Error('No pudimos guardar. Recargá la lista antes de reintentar.')
  const guardada = await leerMateriales(clase)
  if (JSON.stringify(guardada.materiales) !== JSON.stringify(lista)) throw new ConflictoMateriales('Los materiales cambiaron mientras guardabas. Recargá la lista.')
  return guardada
}
