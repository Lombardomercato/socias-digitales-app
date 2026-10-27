import 'server-only'
import { unstable_rethrow } from 'next/navigation'
import { createClient } from './supabase/server'
import { ErrorFotosComunidad, verificarFotosComunidad } from './community-photos-server'
import { puedeUsarComunidad, TAMANO_PAGINA_COMUNIDAD, cursorComunidad, leerCursorComunidad, esPublicacionComunidad, esComentarioComunidad, validarFotosComunidad, compararFotosComunidad,
  type AutorComunidad, type CambioComunidad, type ComentarioComunidad, type FiltroComunidad, type PaginaComunidad, type PaginaComentarios, type PublicacionComunidad,
  type FotoComunidad, type validarNuevaPublicacion, type validarNuevoComentario } from './community'

type Cliente = Awaited<ReturnType<typeof createClient>>
export interface SesionComunidad {
  supabase: Cliente; userId: string; admin: boolean
  perfil: { id: string; rol: string; tipo_usuario: string | null; estado: string | null; nombre: string | null; avatar_url: null }
}
type AccesoComunidad = SesionComunidad | { error: { status: 401 | 403 | 503; mensaje: string } }
export class ErrorComunidad extends Error { constructor(public status: number, mensaje: string) { super(mensaje); this.name = 'ErrorComunidad' } }
export async function autorizarComunidad(): Promise<AccesoComunidad> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: falloSesion } = await supabase.auth.getUser()
    if (falloSesion || !user) return { error: { status: 401, mensaje: 'Iniciá sesión para entrar a la comunidad.' } }
    const { data: perfil, error } = await supabase.from('perfiles').select('id,rol,tipo_usuario,estado,nombre').eq('id', user.id).maybeSingle()
    if (error || !perfil || perfil.id !== user.id) return { error: { status: 503, mensaje: 'No pudimos comprobar tu acceso. Volvé a intentar.' } }
    if (!puedeUsarComunidad(perfil)) return { error: { status: 403, mensaje: 'Comunidad está incluida con Socias activo.' } }
    return { supabase, userId: user.id, admin: perfil.rol === 'admin', perfil: { id: perfil.id, rol: perfil.rol, tipo_usuario: perfil.tipo_usuario, estado: perfil.estado, nombre: perfil.nombre, avatar_url: null } }
  } catch (error) {
    unstable_rethrow(error)
    return { error: { status: 503, mensaje: 'No pudimos comprobar tu acceso. Volvé a intentar.' } }
  }
}

type FilaTexto = { id: string; contenido: string; created_at: string; actualizado_at: string; version: number; retirada_en: string | null; oculta_en: string | null; motivo_moderacion: string | null }
type FilaPublicacion = FilaTexto & { alumna_id: string; tipo: PublicacionComunidad['tipo']; fotos?: FotoComunidad[] }
type FilaComentario = FilaTexto & { autor_id: string; publicacion_id: string }
const CAMPOS_PUBLICACION = 'id,alumna_id,contenido,tipo,created_at,actualizado_at,version,retirada_en,oculta_en,motivo_moderacion,fotos'
const CAMPOS_COMENTARIO = 'id,publicacion_id,autor_id,contenido,created_at,actualizado_at,version,retirada_en,oculta_en,motivo_moderacion'
function falloLectura() { return new ErrorComunidad(503, 'No pudimos cargar la comunidad. Volvé a intentar.') }
function fotosGuardadas(fila: { fotos?: FotoComunidad[] }) { return fila.fotos === undefined ? [] : validarFotosComunidad(fila.fotos) }
async function comprobarFotos(auth: SesionComunidad, postId: string, fotos: FotoComunidad[]) {
  if (!fotos.length) return
  try { await verificarFotosComunidad(auth, postId, fotos) }
  catch (error) {
    if (error instanceof ErrorFotosComunidad) throw new ErrorComunidad(error.status, error.message)
    throw error
  }
}
function enteroSeguro(valor: unknown) {
  const numero = typeof valor === 'number' || typeof valor === 'string' && /^\d+$/.test(valor) ? Number(valor) : NaN
  if (!Number.isSafeInteger(numero) || numero < 0) throw falloLectura()
  return numero
}
async function autoresComunidad(auth: SesionComunidad, ids: string[]) {
  const unicos = [...new Set(ids)]
  if (!unicos.length) return new Map<string, AutorComunidad>()
  const { data, error } = await auth.supabase.rpc('obtener_autores_comunidad', { p_ids: unicos })
  if (error || !Array.isArray(data)) throw falloLectura()
  const autores = new Map<string, AutorComunidad>()
  for (const fila of data) {
    if (!fila || !unicos.includes(fila.id) || autores.has(fila.id) || !(fila.nombre === null || typeof fila.nombre === 'string' && [...fila.nombre].length <= 200) || typeof fila.es_admin !== 'boolean') throw falloLectura()
    autores.set(fila.id, { nombre: fila.nombre, avatar_url: null, es_admin: fila.es_admin })
  }
  if (autores.size !== unicos.length) throw falloLectura()
  return autores
}
async function proyectarPublicaciones(auth: SesionComunidad, filas: FilaPublicacion[]): Promise<PublicacionComunidad[]> {
  if (!filas.length) return []
  const [autores, resumen] = await Promise.all([
    autoresComunidad(auth, filas.map(fila => fila.alumna_id)),
    auth.supabase.rpc('obtener_resumen_comunidad', { p_ids: filas.map(fila => fila.id) }),
  ])
  if (resumen.error || !Array.isArray(resumen.data)) throw falloLectura()
  const conteos = new Map<string, { comentarios: number; felicitaciones: number; felicitada: boolean }>()
  for (const fila of resumen.data) {
    if (!fila || !filas.some(post => post.id === fila.publicacion_id) || conteos.has(fila.publicacion_id) || typeof fila.felicitada !== 'boolean') throw falloLectura()
    conteos.set(fila.publicacion_id, { comentarios: enteroSeguro(fila.total_comentarios), felicitaciones: enteroSeguro(fila.total_felicitaciones), felicitada: fila.felicitada })
  }
  if (conteos.size !== filas.length) throw falloLectura()
  return filas.map(fila => {
    const autor = autores.get(fila.alumna_id), conteo = conteos.get(fila.id)
    if (!autor || !conteo) throw falloLectura()
    const publicacion: PublicacionComunidad = {
      id: fila.id, contenido: fila.contenido, tipo: fila.tipo, created_at: fila.created_at, actualizado_at: fila.actualizado_at, version: fila.version,
      retirada: fila.retirada_en !== null, oculta: fila.oculta_en !== null, propia: fila.alumna_id === auth.userId, autor,
      total_comentarios: conteo.comentarios, total_felicitaciones: conteo.felicitaciones, felicitada: conteo.felicitada,
      fotos: fotosGuardadas(fila),
    }
    if (!esPublicacionComunidad(publicacion)) throw falloLectura()
    return publicacion
  })
}
async function proyectarComentarios(auth: SesionComunidad, filas: FilaComentario[]): Promise<ComentarioComunidad[]> {
  const autores = await autoresComunidad(auth, filas.map(fila => fila.autor_id))
  return filas.map(fila => {
    const autor = autores.get(fila.autor_id)
    if (!autor) throw falloLectura()
    const comentario: ComentarioComunidad = {
      id: fila.id, publicacion_id: fila.publicacion_id, contenido: fila.contenido, created_at: fila.created_at, actualizado_at: fila.actualizado_at, version: fila.version,
      retirada: fila.retirada_en !== null, oculta: fila.oculta_en !== null, propia: fila.autor_id === auth.userId, autor,
    }
    if (!esComentarioComunidad(comentario)) throw falloLectura()
    return comentario
  })
}
export async function leerComunidad(auth: SesionComunidad, filtros: Partial<FiltroComunidad> = {}): Promise<PaginaComunidad> {
  try {
    const vista = filtros.vista ?? 'todas'
    if (!auth.admin && ['ocultas', 'retiradas'].includes(vista)) return { estado: 'error', mensaje: 'Esta vista está reservada a la administración.' }
    let consulta = auth.supabase.from('publicaciones').select(CAMPOS_PUBLICACION).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(TAMANO_PAGINA_COMUNIDAD + 1)
    if (vista === 'mias') consulta = consulta.eq('alumna_id', auth.userId)
    else if (vista === 'ocultas') consulta = consulta.not('oculta_en', 'is', null)
    else if (vista === 'retiradas') consulta = consulta.not('retirada_en', 'is', null)
    else if (!auth.admin) consulta = consulta.is('retirada_en', null).is('oculta_en', null)
    if (filtros.tipo) consulta = consulta.eq('tipo', filtros.tipo)
    const cursor = leerCursorComunidad(filtros.cursor)
    if (cursor) consulta = consulta.or(`created_at.lt.${cursor.fecha},and(created_at.eq.${cursor.fecha},id.lt.${cursor.id})`)
    const { data, error } = await consulta
    if (error || !Array.isArray(data)) throw falloLectura()
    const filas = data.slice(0, TAMANO_PAGINA_COMUNIDAD) as FilaPublicacion[]
    const publicaciones = await proyectarPublicaciones(auth, filas)
    return { estado: 'lista', publicaciones, siguiente: data.length > TAMANO_PAGINA_COMUNIDAD ? cursorComunidad(filas[filas.length - 1]) : null }
  } catch (error) {
    unstable_rethrow(error)
    return { estado: 'error', mensaje: 'No pudimos cargar la comunidad. Volvé a intentar.' }
  }
}
async function buscarPublicacion(auth: SesionComunidad, id: string): Promise<FilaPublicacion | null> {
  const { data, error } = await auth.supabase.from('publicaciones').select(CAMPOS_PUBLICACION).eq('id', id).maybeSingle()
  if (error) throw falloLectura()
  return data as FilaPublicacion | null
}
async function buscarComentario(auth: SesionComunidad, id: string): Promise<FilaComentario | null> {
  const { data, error } = await auth.supabase.from('comentarios').select(CAMPOS_COMENTARIO).eq('id', id).maybeSingle()
  if (error) throw falloLectura()
  return data as FilaComentario | null
}
function exigirPublicacionActiva(fila: FilaPublicacion | null): asserts fila is FilaPublicacion {
  if (!fila || fila.retirada_en !== null || fila.oculta_en !== null) throw new ErrorComunidad(404, 'La publicación ya no está disponible para participar.')
}
export async function leerComentariosComunidad(auth: SesionComunidad, publicacionId: string, siguiente?: string): Promise<PaginaComentarios> {
  try {
    const post = await buscarPublicacion(auth, publicacionId)
    if (!post) return { estado: 'error', mensaje: 'Esta publicación ya no está disponible.' }
    let consulta = auth.supabase.from('comentarios').select(CAMPOS_COMENTARIO).eq('publicacion_id', publicacionId)
      .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(TAMANO_PAGINA_COMUNIDAD + 1)
    // La RLS conserva el historial propio y permite a Flor moderar; el cliente
    // recibe las banderas explícitas y no las interpreta como mensajes nuevos.
    const cursor = leerCursorComunidad(siguiente)
    if (cursor) consulta = consulta.or(`created_at.lt.${cursor.fecha},and(created_at.eq.${cursor.fecha},id.lt.${cursor.id})`)
    const { data, error } = await consulta
    if (error || !Array.isArray(data)) throw falloLectura()
    const filas = data.slice(0, TAMANO_PAGINA_COMUNIDAD) as FilaComentario[]
    const comentarios = await proyectarComentarios(auth, filas)
    return { estado: 'lista', comentarios, siguiente: data.length > TAMANO_PAGINA_COMUNIDAD ? cursorComunidad(filas[filas.length - 1]) : null }
  } catch (error) {
    unstable_rethrow(error)
    return { estado: 'error', mensaje: 'No pudimos cargar los comentarios. Volvé a intentar.' }
  }
}

function errorGuardado(error: { code?: string; message?: string } | null) {
  if (error?.code === '42501') return new ErrorComunidad(403, 'Tu acceso cambió o esta acción no está permitida. Actualizá la comunidad.')
  if (error?.code === '23505') return new ErrorComunidad(409, 'Este envío ya existe. Actualizá la comunidad antes de intentar nuevamente.')
  if (error?.code === '23514' || error?.code === '22023') return new ErrorComunidad(400, 'Revisá el mensaje antes de intentar nuevamente.')
  if (error?.code === 'P0001' && error.message === 'community_rate_limit') return new ErrorComunidad(429, 'Ya compartiste varios mensajes. Esperá un poco antes de volver a intentar.')
  return new ErrorComunidad(503, 'No pudimos confirmar el guardado. Tu mensaje se conserva; reintentá el mismo envío.')
}
export async function crearPublicacionComunidad(auth: SesionComunidad, entrada: ReturnType<typeof validarNuevaPublicacion>): Promise<PublicacionComunidad> {
  const existente = await buscarPublicacion(auth, entrada.id)
  const fotos = validarFotosComunidad(entrada.fotos ?? [])
  const coincide = (fila: FilaPublicacion | null) => fila && fila.alumna_id === auth.userId && fila.version === 1 && fila.tipo === entrada.tipo && fila.contenido === entrada.contenido && fila.retirada_en === null && fila.oculta_en === null && compararFotosComunidad(fotosGuardadas(fila), fotos)
  if (existente) {
    if (!coincide(existente)) throw new ErrorComunidad(409, 'Este envío fue guardado con otros datos. Actualizá la comunidad.')
    return (await proyectarPublicaciones(auth, [existente]))[0]
  }
  if (!entrada.contenido.trim() && !fotos.length) throw new ErrorComunidad(400, 'Escribí un mensaje o agregá al menos una foto antes de compartir.')
  await comprobarFotos(auth, entrada.id, fotos)
  const { data, error } = await auth.supabase.from('publicaciones').insert({ id: entrada.id, alumna_id: auth.userId, tipo: entrada.tipo, contenido: entrada.contenido, fotos }).select(CAMPOS_PUBLICACION).maybeSingle()
  if (!error && coincide(data)) return (await proyectarPublicaciones(auth, [data as FilaPublicacion]))[0]
  const confirmada = await buscarPublicacion(auth, entrada.id)
  if (coincide(confirmada)) return (await proyectarPublicaciones(auth, [confirmada!]))[0]
  throw errorGuardado(error)
}
export async function crearComentarioComunidad(auth: SesionComunidad, publicacionId: string, entrada: ReturnType<typeof validarNuevoComentario>): Promise<ComentarioComunidad> {
  exigirPublicacionActiva(await buscarPublicacion(auth, publicacionId))
  const existente = await buscarComentario(auth, entrada.id)
  const coincide = (fila: FilaComentario | null) => fila && fila.autor_id === auth.userId && fila.publicacion_id === publicacionId && fila.version === 1 && fila.contenido === entrada.contenido && fila.retirada_en === null && fila.oculta_en === null
  if (existente) {
    if (!coincide(existente)) throw new ErrorComunidad(409, 'Este envío fue guardado con otros datos. Actualizá los comentarios.')
    return (await proyectarComentarios(auth, [existente]))[0]
  }
  const { data, error } = await auth.supabase.from('comentarios').insert({ id: entrada.id, publicacion_id: publicacionId, autor_id: auth.userId, contenido: entrada.contenido }).select(CAMPOS_COMENTARIO).maybeSingle()
  if (!error && coincide(data)) return (await proyectarComentarios(auth, [data as FilaComentario]))[0]
  const confirmada = await buscarComentario(auth, entrada.id)
  if (coincide(confirmada)) return (await proyectarComentarios(auth, [confirmada!]))[0]
  throw errorGuardado(error)
}
function coincideCambio(fila: FilaTexto & { tipo?: string; fotos?: FotoComunidad[] }, cambio: CambioComunidad) {
  if (cambio.accion === 'editar') return fila.contenido === cambio.contenido && (cambio.tipo === undefined || fila.tipo === cambio.tipo) &&
    (cambio.fotos === undefined || compararFotosComunidad(fotosGuardadas(fila), cambio.fotos))
  if (cambio.accion === 'retirar') return fila.retirada_en !== null
  if (cambio.accion === 'restaurar') return fila.retirada_en === null
  if (cambio.accion === 'ocultar') return fila.oculta_en !== null && fila.motivo_moderacion === cambio.motivo
  return fila.oculta_en === null
}
function prepararCambio(auth: SesionComunidad, fila: FilaTexto & { tipo?: string; fotos?: FotoComunidad[] }, autorId: string, cambio: CambioComunidad) {
  if (['ocultar', 'mostrar'].includes(cambio.accion)) {
    if (!auth.admin) throw new ErrorComunidad(403, 'Solo Flor y su equipo pueden moderar publicaciones.')
  } else if (autorId !== auth.userId) throw new ErrorComunidad(403, 'Solo la autora puede cambiar este mensaje.')
  if (fila.version === cambio.version + 1 && coincideCambio(fila, cambio)) return null
  if (fila.version !== cambio.version) throw new ErrorComunidad(409, 'El mensaje cambió en otra pestaña. Volvé a abrir la versión guardada.')
  if (cambio.accion === 'editar' && (fila.retirada_en !== null || fila.oculta_en !== null)) throw new ErrorComunidad(409, 'Este mensaje está retirado u oculto. Actualizá la comunidad antes de editarlo.')
  if (cambio.accion !== 'editar' && coincideCambio(fila, cambio)) throw new ErrorComunidad(409, 'El estado de este mensaje ya cambió. Actualizá la comunidad.')
  if (cambio.accion === 'editar') return { contenido: cambio.contenido, ...(cambio.tipo ? { tipo: cambio.tipo } : {}), ...(cambio.fotos === undefined ? {} : { fotos: cambio.fotos }) }
  if (cambio.accion === 'retirar') return { retirada_en: new Date().toISOString() }
  if (cambio.accion === 'restaurar') return { retirada_en: null }
  if (cambio.accion === 'ocultar') return { oculta_en: new Date().toISOString(), moderada_por: auth.userId, motivo_moderacion: cambio.motivo }
  return { oculta_en: null, moderada_por: auth.userId, motivo_moderacion: null }
}
export async function cambiarPublicacionComunidad(auth: SesionComunidad, id: string, cambio: CambioComunidad): Promise<PublicacionComunidad> {
  const existente = await buscarPublicacion(auth, id)
  if (!existente) throw new ErrorComunidad(404, 'Esta publicación ya no está disponible.')
  const datos = prepararCambio(auth, existente, existente.alumna_id, cambio)
  if (datos === null) return (await proyectarPublicaciones(auth, [existente]))[0]
  if (cambio.accion === 'editar') {
    const fotos = cambio.fotos ?? fotosGuardadas(existente)
    if (!cambio.contenido?.trim() && !fotos.length) throw new ErrorComunidad(400, 'Escribí un mensaje o agregá al menos una foto antes de guardar.')
    await comprobarFotos(auth, id, fotos)
  }
  const { data, error } = await auth.supabase.from('publicaciones').update(datos).eq('id', id).eq('version', cambio.version).select(CAMPOS_PUBLICACION).maybeSingle()
  if (!error && data && data.version === cambio.version + 1 && coincideCambio(data, cambio)) return (await proyectarPublicaciones(auth, [data as FilaPublicacion]))[0]
  const confirmada = await buscarPublicacion(auth, id)
  if (confirmada && confirmada.version === cambio.version + 1 && coincideCambio(confirmada, cambio)) return (await proyectarPublicaciones(auth, [confirmada]))[0]
  if (!error || confirmada && confirmada.version !== cambio.version) throw new ErrorComunidad(409, 'El mensaje cambió. Volvé a abrir la versión guardada.')
  throw errorGuardado(error)
}
export async function cambiarComentarioComunidad(auth: SesionComunidad, id: string, cambio: CambioComunidad): Promise<ComentarioComunidad> {
  const existente = await buscarComentario(auth, id)
  if (!existente) throw new ErrorComunidad(404, 'Este comentario ya no está disponible.')
  const post = await buscarPublicacion(auth, existente.publicacion_id)
  if (!post) throw new ErrorComunidad(404, 'La publicación ya no está disponible.')
  const datos = prepararCambio(auth, existente, existente.autor_id, cambio)
  if (datos === null) return (await proyectarComentarios(auth, [existente]))[0]
  const { data, error } = await auth.supabase.from('comentarios').update(datos).eq('id', id).eq('version', cambio.version).select(CAMPOS_COMENTARIO).maybeSingle()
  if (!error && data && data.version === cambio.version + 1 && coincideCambio(data, cambio)) return (await proyectarComentarios(auth, [data as FilaComentario]))[0]
  const confirmada = await buscarComentario(auth, id)
  if (confirmada && confirmada.version === cambio.version + 1 && coincideCambio(confirmada, cambio)) return (await proyectarComentarios(auth, [confirmada]))[0]
  if (!error || confirmada && confirmada.version !== cambio.version) throw new ErrorComunidad(409, 'El comentario cambió. Volvé a abrir la versión guardada.')
  throw errorGuardado(error)
}
export async function felicitarPublicacionComunidad(auth: SesionComunidad, publicacionId: string, activo: boolean) {
  exigirPublicacionActiva(await buscarPublicacion(auth, publicacionId))
  const { data: anterior, error: fallo } = await auth.supabase.from('reacciones').select('id').eq('publicacion_id', publicacionId).eq('alumna_id', auth.userId).maybeSingle()
  if (fallo) throw falloLectura()
  if (activo && !anterior) {
    const { error } = await auth.supabase.from('reacciones').insert({ publicacion_id: publicacionId, alumna_id: auth.userId, tipo: 'felicitar' })
    if (error && error.code !== '23505') throw errorGuardado(error)
  } else if (!activo && anterior) {
    const { error } = await auth.supabase.from('reacciones').delete().eq('publicacion_id', publicacionId).eq('alumna_id', auth.userId)
    if (error) throw errorGuardado(error)
  }
  const { data: actual, error } = await auth.supabase.from('reacciones').select('id').eq('publicacion_id', publicacionId).eq('alumna_id', auth.userId).maybeSingle()
  if (error || Boolean(actual) !== activo) throw new ErrorComunidad(409, 'Tu felicitación cambió. Actualizá la publicación antes de intentar nuevamente.')
  const { data: resumen, error: resumenError } = await auth.supabase.rpc('obtener_resumen_comunidad', { p_ids: [publicacionId] })
  if (resumenError || !Array.isArray(resumen) || resumen.length !== 1 || resumen[0].publicacion_id !== publicacionId || resumen[0].felicitada !== activo) throw falloLectura()
  // El test puede felicitar sin sumar una cifra visible a alumnas reales; la
  // proyección SQL respeta la misma separación que los mensajes de prueba.
  return { activo, total: enteroSeguro(resumen[0].total_felicitaciones) }
}
