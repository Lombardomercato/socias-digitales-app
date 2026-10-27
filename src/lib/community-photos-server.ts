import 'server-only'
import sharp from 'sharp'
import { createHash } from 'node:crypto'
import { pedirR2 } from './r2-upload'
import { idComunidadValido, validarFotosComunidad, type FotoComunidad } from './community'
import type { SesionComunidad } from './community-server'

const MAX_BYTES = 4 * 1024 * 1024
const MAX_SALIDA = 2 * 1024 * 1024
const TIPOS = ['image/jpeg', 'image/png', 'image/webp']
export class ErrorFotosComunidad extends Error {
  constructor(public status: number, mensaje: string) { super(mensaje); this.name = 'ErrorFotosComunidad' }
}
const fallo = () => new ErrorFotosComunidad(503, 'No pudimos confirmar la foto. Reintentá el mismo envío; tu publicación se conserva.')
function clave(autora: string, publicacion: string, foto: string) {
  if (![autora, publicacion, foto].every(idComunidadValido)) throw new ErrorFotosComunidad(400, 'Foto o publicación no válida.')
  return `comunidad-fotos/archivos/${autora.toLowerCase()}/${publicacion.toLowerCase()}/${foto.toLowerCase()}.webp`
}
async function publicacion(auth: SesionComunidad, id: string) {
  const { data, error } = await auth.supabase.from('publicaciones').select('id,alumna_id,fotos,retirada_en,oculta_en').eq('id', id).maybeSingle()
  if (error) throw fallo()
  return data as { id: string; alumna_id: string; fotos: FotoComunidad[]; retirada_en: string | null; oculta_en: string | null } | null
}
function fotoDeCabeceras(headers: Headers, id: string): FotoComunidad {
  const foto = { id, ancho: Number(headers.get('x-amz-meta-ancho')), alto: Number(headers.get('x-amz-meta-alto')) }
  try { return validarFotosComunidad([foto])[0] } catch { throw fallo() }
}
function metadatosValidos(response: Response, autora: string, post: string, foto: string) {
  const declarada = response.headers.get('content-length') ?? ''
  const longitud = Number(declarada)
  return response.ok && response.headers.get('content-type')?.split(';')[0] === 'image/webp' &&
    response.headers.get('x-amz-meta-autora') === autora && response.headers.get('x-amz-meta-publicacion') === post &&
    response.headers.get('x-amz-meta-foto') === foto && /^[a-f0-9]{64}$/.test(response.headers.get('x-amz-meta-entrada-sha256') ?? '') &&
    /^\d+$/.test(declarada) && Number.isSafeInteger(longitud) && longitud > 0 && longitud <= MAX_SALIDA
}
async function textoCuota(response: Response) {
  if (!response.body) throw fallo()
  const lector = response.body.getReader(), buffer = Buffer.alloc(16000)
  let total = 0
  try {
    while (true) {
      const { done, value } = await lector.read()
      if (done) break
      if (total + value.byteLength > buffer.length) { await lector.cancel(); throw fallo() }
      buffer.set(value, total); total += value.byteLength
    }
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, total))
  } catch { throw fallo() } finally { lector.releaseLock() }
}
async function cabecera(autora: string, post: string, foto: string) {
  try { return await pedirR2('HEAD', clave(autora, post, foto), {}, '', undefined, undefined, { timeoutMs: 7000 }) }
  catch { throw fallo() }
}

// Se reserva antes de decodificar o escribir. La cuota es diaria en Argentina;
// fallos/cancelaciones consumen su reserva y el mismo intento no consume otra.
async function reservar(auth: SesionComunidad, post: string, foto: string, hash: string) {
  const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Cordoba', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const key = `comunidad-fotos/cuotas/${auth.userId}/${dia}.json`
  for (let intento = 0; intento < 3; intento++) {
    let response: Response
    try { response = await pedirR2('GET', key, {}, '', undefined, undefined, { timeoutMs: 7000, sinCompresion: true }) } catch { throw fallo() }
    let reservas: { post: string; foto: string; hash: string }[] = [], etag: string | null = null
    if (response.status !== 404) {
      if (!response.ok || Number(response.headers.get('content-length')) > 16000) throw fallo()
      const text = await textoCuota(response)
      let raw: unknown
      try { raw = JSON.parse(text) } catch { throw fallo() }
      const data = raw as { version?: unknown; reservas?: unknown }
      if (data?.version !== 1 || !Array.isArray(data.reservas) || data.reservas.length > 20 || !data.reservas.every(r => r && idComunidadValido(r.post) && idComunidadValido(r.foto) && typeof r.hash === 'string' && /^[a-f0-9]{64}$/.test(r.hash))) throw fallo()
      reservas = data.reservas
      etag = response.headers.get('etag')
      if (etag?.startsWith('W/')) {
        const head = await pedirR2('HEAD', key, {}, '', undefined, undefined, { timeoutMs: 7000, sinCompresion: true })
        if (!head.ok || head.headers.get('etag') !== etag.slice(2)) throw fallo()
        etag = head.headers.get('etag')
      }
      if (!etag || !/^"[\x21\x23-\x7e]{1,200}"$/.test(etag)) throw fallo()
    }
    const previa = reservas.find(r => r.post === post && r.foto === foto)
    if (previa) {
      if (previa.hash !== hash) throw new ErrorFotosComunidad(409, 'Esta foto ya se preparó con otro archivo. Elegila nuevamente antes de publicar.')
      return
    }
    if (reservas.length >= 20) throw new ErrorFotosComunidad(429, 'Llegaste al límite de 20 fotos de hoy. Podés compartir texto y volver a subir fotos mañana.')
    const body = JSON.stringify({ version: 1, reservas: [...reservas, { post, foto, hash }] })
    let saved: Response
    try { saved = await pedirR2('PUT', key, {}, body, 'application/json', etag ? { 'If-Match': etag } : { 'If-None-Match': '*' }, { timeoutMs: 7000 }) } catch { throw fallo() }
    if (saved.status === 412 || saved.status === 409) continue
    if (!saved.ok) throw fallo()
    return
  }
  throw fallo()
}
export async function leerBytesFoto(request: Request) {
  const tipo = request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() ?? ''
  if (!TIPOS.includes(tipo)) throw new ErrorFotosComunidad(415, 'Elegí una foto JPG, PNG o WebP.')
  const declarado = request.headers.get('content-length')
  if (declarado !== null && (!/^\d+$/.test(declarado) || Number(declarado) > MAX_BYTES)) throw new ErrorFotosComunidad(413, 'La foto preparada debe pesar menos de 4 MB.')
  if (!request.body) throw new ErrorFotosComunidad(400, 'Elegí una foto antes de subirla.')
  const reader = request.body.getReader(), acumulado = Buffer.alloc(MAX_BYTES)
  let total = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (total + value.byteLength > MAX_BYTES) { await reader.cancel(); throw new ErrorFotosComunidad(413, 'La foto preparada debe pesar menos de 4 MB.') }
      acumulado.set(value, total)
      total += value.byteLength
    }
  } finally { reader.releaseLock() }
  if (!total) throw new ErrorFotosComunidad(400, 'La foto está vacía.')
  return { bytes: acumulado.subarray(0, total), tipo }
}
export async function subirFotoComunidad(auth: SesionComunidad, postId: string, fotoId: string, request: Request): Promise<FotoComunidad> {
  clave(auth.userId, postId, fotoId)
  const existente = await publicacion(auth, postId)
  if (existente && (existente.alumna_id !== auth.userId || existente.retirada_en !== null || existente.oculta_en !== null)) throw new ErrorFotosComunidad(403, 'Solo podés agregar fotos a tus publicaciones activas.')
  const { bytes, tipo } = await leerBytesFoto(request)
  const jpg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  const webp = bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP'
  if (!(tipo === 'image/jpeg' && jpg || tipo === 'image/png' && png || tipo === 'image/webp' && webp)) throw new ErrorFotosComunidad(415, 'El archivo no es una foto JPG, PNG o WebP válida.')
  const hash = createHash('sha256').update(bytes).digest('hex')
  const anterior = await cabecera(auth.userId, postId, fotoId)
  if (anterior.status !== 404) {
    if (!metadatosValidos(anterior, auth.userId, postId, fotoId)) throw fallo()
    if (anterior.headers.get('x-amz-meta-entrada-sha256') !== hash) throw new ErrorFotosComunidad(409, 'Esta foto ya se cargó con otro archivo. Elegila nuevamente.')
    return fotoDeCabeceras(anterior.headers, fotoId)
  }
  await reservar(auth, postId, fotoId, hash)
  let normalizada: { data: Buffer; info: { width: number; height: number } }
  try {
    const image = sharp(bytes, { failOn: 'warning', limitInputPixels: 25_000_000, animated: false })
    const info = await image.metadata()
    if (!['jpeg', 'png', 'webp'].includes(info.format ?? '') || tipo !== `image/${info.format === 'jpeg' ? 'jpeg' : info.format}` || (info.pages ?? 1) > 1) throw new Error('Formato no permitido')
    normalizada = await image.rotate().resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true }).webp({ quality: 84, effort: 4 }).timeout({ seconds: 8 }).toBuffer({ resolveWithObject: true })
  } catch { throw new ErrorFotosComunidad(422, 'No pudimos preparar esa imagen. Probá con otra foto JPG, PNG o WebP, sin animación.') }
  if (!normalizada.data.length || normalizada.data.length > MAX_SALIDA) throw new ErrorFotosComunidad(413, 'La imagen sigue siendo muy pesada. Elegí una foto más pequeña.')
  const metadatos = { autora: auth.userId, publicacion: postId, foto: fotoId, 'entrada-sha256': hash, ancho: String(normalizada.info.width), alto: String(normalizada.info.height) }
  let saved: Response
  try { saved = await pedirR2('PUT', clave(auth.userId, postId, fotoId), {}, new Uint8Array(normalizada.data), 'image/webp', { 'If-None-Match': '*' }, { timeoutMs: 12000, metadatos }) } catch { throw fallo() }
  if (!saved.ok && saved.status !== 412 && saved.status !== 409) throw fallo()
  const head = await cabecera(auth.userId, postId, fotoId)
  if (!metadatosValidos(head, auth.userId, postId, fotoId) || head.headers.get('x-amz-meta-entrada-sha256') !== hash) throw fallo()
  return fotoDeCabeceras(head.headers, fotoId)
}
export async function verificarFotosComunidad(auth: SesionComunidad, postId: string, fotos: FotoComunidad[]) {
  for (const foto of validarFotosComunidad(fotos)) {
    const head = await cabecera(auth.userId, postId, foto.id)
    if (head.status === 404) throw new ErrorFotosComunidad(400, 'Una foto todavía no terminó de cargarse. Reintentá antes de publicar.')
    if (!metadatosValidos(head, auth.userId, postId, foto.id)) throw fallo()
    const guardada = fotoDeCabeceras(head.headers, foto.id)
    if (guardada.ancho !== foto.ancho || guardada.alto !== foto.alto) throw new ErrorFotosComunidad(409, 'La foto cambió. Volvé a prepararla antes de publicar.')
  }
}
export async function obtenerFotoComunidad(auth: SesionComunidad, postId: string, fotoId: string) {
  if (!idComunidadValido(postId) || !idComunidadValido(fotoId)) throw new ErrorFotosComunidad(404, 'Foto no disponible.')
  const post = await publicacion(auth, postId)
  if (!post || !Array.isArray(post.fotos) || !post.fotos.some(f => f.id === fotoId)) throw new ErrorFotosComunidad(404, 'Foto no disponible.')
  let result: Response
  try { result = await pedirR2('GET', clave(post.alumna_id, postId, fotoId), {}, '', undefined, undefined, { timeoutMs: 10000 }) } catch { throw fallo() }
  if (result.status === 404) throw new ErrorFotosComunidad(404, 'Foto no disponible.')
  if (!metadatosValidos(result, post.alumna_id, postId, fotoId)) throw fallo()
  const meta = fotoDeCabeceras(result.headers, fotoId), dto = post.fotos.find(f => f.id === fotoId)!
  if (meta.ancho !== dto.ancho || meta.alto !== dto.alto) throw fallo()
  return new Response(result.body, { headers: { 'Content-Type': 'image/webp', 'Content-Length': result.headers.get('content-length')!, 'Cache-Control': 'private, no-store', 'Vary': 'Cookie', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'none'; sandbox" } })
}
