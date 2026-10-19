import { esUuid } from './class-management'

export const MAX_MATERIAL_BYTES = 25 * 1024 * 1024
export const MAX_MATERIALES = 30
export const MAX_HISTORIAL_MATERIALES = 100
export const TIPOS_MATERIAL = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
} as const
export const ACEPTAR_MATERIALES = Object.keys(TIPOS_MATERIAL).map(e => '.' + e).join(',')
export interface ArchivoMaterial { nombre: string; bytes: number; mime: string; extension: keyof typeof TIPOS_MATERIAL }
export type MaterialClase = { id: string; titulo: string; activo: boolean; creado: string } & (
  { tipo: 'enlace'; url: string } | { tipo: 'archivo'; archivo: ArchivoMaterial }
)
export interface MaterialVisible { id: string; titulo: string; tipo: 'enlace' | 'archivo'; detalle: string; href: string }

export function tituloMaterial(value: unknown) {
  if (typeof value !== 'string') throw new Error('Escribí un nombre para el material.')
  const titulo = value.trim().replace(/\s+/g, ' ')
  if (!titulo || titulo.length > 120 || /[\x00-\x1f\x7f]/.test(titulo)) throw new Error('El nombre debe tener entre 1 y 120 caracteres.')
  return titulo
}
export function enlaceMaterial(value: unknown) {
  if (typeof value !== 'string' || value.length > 2048 || /[\x00-\x20\x7f]/.test(value.trim())) throw new Error('Usá un enlace completo que empiece con https://.')
  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'https:' || url.username || url.password || !url.hostname.includes('.') || url.hostname.endsWith('.local') || /^(localhost|127\.|0\.|169\.254\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url.hostname)) throw new Error()
    return url.href
  } catch { throw new Error('Usá un enlace HTTPS válido, sin usuario ni contraseña.') }
}
export function archivoMaterial(nombre: unknown, bytes: unknown): ArchivoMaterial {
  if (typeof nombre !== 'string' || !nombre.trim() || nombre.length > 180 || /[\\/\x00-\x1f\x7f]/.test(nombre)) throw new Error('Revisá el nombre del archivo.')
  if (typeof bytes !== 'number' || !Number.isSafeInteger(bytes) || bytes <= 0 || bytes > MAX_MATERIAL_BYTES) throw new Error('El archivo debe pesar hasta 25 MB y no estar vacío.')
  const extension = nombre.split('.').pop()?.toLowerCase() as keyof typeof TIPOS_MATERIAL
  if (!Object.hasOwn(TIPOS_MATERIAL, extension)) throw new Error('Usá PDF, DOCX, XLSX, PPTX, TXT, JPG, PNG o WebP.')
  return { nombre: nombre.trim(), bytes, extension, mime: TIPOS_MATERIAL[extension] }
}
export function firmaArchivoMaterial(bytes: Uint8Array, extension: ArchivoMaterial['extension']) {
  const inicia = (...firma: number[]) => firma.every((b, i) => bytes[i] === b)
  if (extension === 'pdf') return inicia(0x25, 0x50, 0x44, 0x46, 0x2d)
  if (['docx', 'xlsx', 'pptx'].includes(extension)) return inicia(0x50, 0x4b, 0x03, 0x04)
  if (extension === 'png') return inicia(137, 80, 78, 71, 13, 10, 26, 10)
  if (extension === 'jpg' || extension === 'jpeg') return inicia(255, 216, 255)
  if (extension === 'webp') return inicia(82, 73, 70, 70) && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  try { return !new TextDecoder('utf-8', { fatal: true }).decode(bytes).includes('\0') } catch { return false }
}
export function claveMaterial(clase: string, id: string, extension: string, temporal = false) {
  if (!esUuid(clase) || !esUuid(id) || !Object.hasOwn(TIPOS_MATERIAL, extension)) throw new Error('Material no válido.')
  return `materiales-clases/${clase}/${temporal ? 'temporales/' : 'archivos/'}${id}.${extension}`
}
export function validarMateriales(value: unknown): MaterialClase[] {
  if (!Array.isArray(value) || value.length > MAX_HISTORIAL_MATERIALES) throw new Error('Los materiales requieren revisión.')
  const ids = new Set<string>()
  const materiales = value.map(m => {
    if (!m || !esUuid(m.id) || ids.has(m.id) || typeof m.activo !== 'boolean' || typeof m.creado !== 'string' || !Number.isFinite(Date.parse(m.creado))) throw new Error('Material no válido.')
    ids.add(m.id)
    const base = { id: m.id, titulo: tituloMaterial(m.titulo), activo: m.activo, creado: m.creado }
    if (m.tipo === 'enlace') return { ...base, tipo: 'enlace' as const, url: enlaceMaterial(m.url) }
    if (m.tipo === 'archivo' && m.archivo) return { ...base, tipo: 'archivo' as const, archivo: archivoMaterial(m.archivo.nombre, m.archivo.bytes) }
    throw new Error('Material no válido.')
  })
  if (materiales.filter(m => m.activo).length > MAX_MATERIALES) throw new Error('Podés compartir hasta 30 materiales por clase.')
  return materiales
}
export function detalleMaterial(m: MaterialClase) {
  if (m.tipo === 'enlace') return new URL(m.url).hostname.replace(/^www\./, '')
  return `${m.archivo.extension.toUpperCase()} · ${m.archivo.bytes < 1024 * 1024 ? Math.max(1, Math.ceil(m.archivo.bytes / 1024)) + ' KB' : (m.archivo.bytes / 1024 / 1024).toFixed(1) + ' MB'}`
}
export function materialesVisibles(clase: string, materiales: MaterialClase[]): MaterialVisible[] {
  return materiales.filter(m => m.activo).map(m => ({ id: m.id, titulo: m.titulo, tipo: m.tipo, detalle: detalleMaterial(m), href: `/api/classroom/${clase}/materiales/${m.id}` }))
}
// El orden del índice es el mismo que recibe la alumna. Los retirados no
// participan del movimiento y conservan su posición e historial.
export function moverMaterial(materiales: MaterialClase[], id: unknown, direccion: unknown): MaterialClase[] {
  if (!esUuid(id) || (direccion !== 'arriba' && direccion !== 'abajo')) throw new Error('Movimiento no válido.')
  const posiciones = materiales.flatMap((m, i) => m.activo ? [i] : [])
  const actual = posiciones.findIndex(i => materiales[i].id === id)
  if (actual < 0) throw new Error('Elegí un material disponible.')
  const destino = actual + (direccion === 'arriba' ? -1 : 1)
  if (destino < 0 || destino >= posiciones.length) throw new Error('El material ya está en esa posición.')
  const copia = [...materiales], a = posiciones[actual], b = posiciones[destino]
  ;[copia[a], copia[b]] = [copia[b], copia[a]]
  return copia
}
