import 'server-only'
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { archivoMaterial, claveMaterial, firmaArchivoMaterial, tituloMaterial, type ArchivoMaterial } from './class-materials'
import { esUuid } from './class-management'
import { pedirR2 } from './r2-upload'

interface Ticket { user: string; clase: string; id: string; titulo: string; archivo: ArchivoMaterial; exp: number }
export function ticketMaterial(data: Ticket) {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url')
  return `${payload}.${createHmac('sha256', process.env.R2_SECRET_ACCESS_KEY!).update('sd-material-v1:' + payload).digest('base64url')}`
}
export function leerTicketMaterial(value: unknown, user: string, clase: string): Ticket {
  try {
    if (typeof value !== 'string' || value.length > 3000) throw new Error()
    const [payload, sig, ...rest] = value.split('.')
    const expected = createHmac('sha256', process.env.R2_SECRET_ACCESS_KEY!).update('sd-material-v1:' + payload).digest()
    const given = Buffer.from(sig ?? '', 'base64url')
    if (rest.length || given.length !== expected.length || !timingSafeEqual(given, expected)) throw new Error()
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (data.user !== user || data.clase !== clase || !esUuid(data.id) || !Number.isSafeInteger(data.exp) || data.exp < Date.now()) throw new Error()
    return { ...data, titulo: tituloMaterial(data.titulo), archivo: archivoMaterial(data.archivo.nombre, data.archivo.bytes) }
  } catch { throw new Error('La carga venció o no corresponde a esta clase. Volvé a elegir el archivo.') }
}
export async function consolidarArchivo(clase: string, id: string, archivo: ArchivoMaterial) {
  const response = await pedirR2('GET', claveMaterial(clase, id, archivo.extension, true))
  if (!response.ok || Number(response.headers.get('content-length')) !== archivo.bytes) throw new Error('La carga no está completa. Volvé a subir el archivo.')
  const bytes = new Uint8Array(await response.arrayBuffer())
  if (bytes.length !== archivo.bytes || !firmaArchivoMaterial(bytes, archivo.extension)) throw new Error('El contenido no coincide con el formato del archivo.')
  // El URL de carga solo sirve para el temporal. El archivo publicado es otro
  // objeto, inmutable: reutilizar un URL de carga nunca reemplaza un material.
  const key = claveMaterial(clase, id, archivo.extension)
  const saved = await pedirR2('PUT', key, {}, bytes, archivo.mime, { 'If-None-Match': '*' })
  if (saved.status === 412) {
    const anterior = await pedirR2('GET', key)
    if (!anterior.ok || Number(anterior.headers.get('content-length')) !== bytes.length || createHash('sha256').update(new Uint8Array(await anterior.arrayBuffer())).digest('hex') !== createHash('sha256').update(bytes).digest('hex')) throw new Error('La carga cambió. Volvé a elegir el archivo.')
  } else if (!saved.ok) throw new Error('No pudimos guardar el archivo. Intentá nuevamente.')
}
