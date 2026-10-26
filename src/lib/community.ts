export const TIPOS_PUBLICACION_COMUNIDAD = { avance: 'Un avance', pregunta: 'Una pregunta', idea: 'Una idea' } as const
export type TipoPublicacionComunidad = keyof typeof TIPOS_PUBLICACION_COMUNIDAD
export type VistaComunidad = 'todas' | 'mias' | 'ocultas' | 'retiradas'
export type AccionComunidad = 'editar' | 'retirar' | 'restaurar' | 'ocultar' | 'mostrar'
export const LIMITE_PUBLICACION_COMUNIDAD = 2000
export const LIMITE_COMENTARIO_COMUNIDAD = 1000
export const TAMANO_PAGINA_COMUNIDAD = 20

export interface AutorComunidad { nombre: string | null; avatar_url: null; es_admin: boolean }
interface TextoComunidad {
  id: string; contenido: string; created_at: string; actualizado_at: string; version: number
  retirada: boolean; oculta: boolean; propia: boolean; autor: AutorComunidad
}
export interface PublicacionComunidad extends TextoComunidad {
  tipo: TipoPublicacionComunidad; total_comentarios: number; total_felicitaciones: number; felicitada: boolean
}
export interface ComentarioComunidad extends TextoComunidad { publicacion_id: string }
export type PaginaComunidad = { estado: 'lista'; publicaciones: PublicacionComunidad[]; siguiente: string | null } | { estado: 'error'; mensaje: string }
export type PaginaComentarios = { estado: 'lista'; comentarios: ComentarioComunidad[]; siguiente: string | null } | { estado: 'error'; mensaje: string }
export type PaginaComentariosComunidad = PaginaComentarios
export interface PerfilComunidad { id?: string; rol?: string | null; tipo_usuario?: string | null; estado?: string | null }

export function puedeUsarComunidad(perfil: PerfilComunidad | null | undefined) {
  if (!perfil) return false
  if (perfil.rol === 'admin') return true
  if (perfil.estado !== 'activa') return false
  if (['gratuito', 'desafio', 'socia'].includes(perfil.tipo_usuario ?? '')) return perfil.tipo_usuario === 'socia'
  return ['afiliada', 'afiliada_lanzamiento'].includes(perfil.rol ?? '')
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function idComunidadValido(valor: unknown): valor is string { return typeof valor === 'string' && UUID.test(valor) }
function objeto(valor: unknown): valor is Record<string, unknown> { return Boolean(valor && typeof valor === 'object' && !Array.isArray(valor)) }
function campos(valor: unknown, permitidos: string[]) {
  if (!objeto(valor) || Object.keys(valor).some(campo => !permitidos.includes(campo))) throw new Error('El envío contiene datos no permitidos.')
  return valor
}
export function normalizarTextoComunidad(valor: unknown, limite = LIMITE_PUBLICACION_COMUNIDAD) {
  if (typeof valor !== 'string') throw new Error('Escribí un mensaje para compartir.')
  const texto = valor.normalize('NFC').replace(/\r\n?/g, '\n').trim()
  if (!texto || [...texto].length > limite || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(texto)) throw new Error(`Usá un mensaje de entre 1 y ${limite} caracteres.`)
  return texto
}
function tipoValido(valor: unknown): valor is TipoPublicacionComunidad { return typeof valor === 'string' && Object.hasOwn(TIPOS_PUBLICACION_COMUNIDAD, valor) }
function versionValida(valor: unknown): valor is number { return typeof valor === 'number' && Number.isSafeInteger(valor) && valor >= 1 && valor <= 1e9 }
export function validarNuevaPublicacion(valor: unknown) {
  const entrada = campos(valor, ['id', 'tipo', 'contenido'])
  if (!idComunidadValido(entrada.id)) throw new Error('El identificador de la publicación no es válido.')
  if (!tipoValido(entrada.tipo)) throw new Error('Elegí qué querés compartir.')
  return { id: entrada.id.toLowerCase(), tipo: entrada.tipo, contenido: normalizarTextoComunidad(entrada.contenido) }
}
export function validarNuevoComentario(valor: unknown) {
  const entrada = campos(valor, ['id', 'contenido'])
  if (!idComunidadValido(entrada.id)) throw new Error('El identificador del comentario no es válido.')
  return { id: entrada.id.toLowerCase(), contenido: normalizarTextoComunidad(entrada.contenido, LIMITE_COMENTARIO_COMUNIDAD) }
}
export interface CambioComunidad { version: number; accion: AccionComunidad; contenido?: string; tipo?: TipoPublicacionComunidad; motivo?: string }
export function validarCambioComunidad(valor: unknown, comentario = false): CambioComunidad {
  const entrada = campos(valor, ['version', 'accion', 'contenido', 'tipo', 'motivo'])
  if (!versionValida(entrada.version)) throw new Error('Volvé a abrir la versión guardada antes de editarla.')
  if (!['editar', 'retirar', 'restaurar', 'ocultar', 'mostrar'].includes(String(entrada.accion))) throw new Error('La acción no es válida.')
  const accion = entrada.accion as AccionComunidad
  const permitidos = accion === 'editar' ? ['version', 'accion', 'contenido', ...(comentario ? [] : ['tipo'])] : accion === 'ocultar' ? ['version', 'accion', 'motivo'] : ['version', 'accion']
  if (Object.keys(entrada).some(campo => !permitidos.includes(campo))) throw new Error('La acción contiene datos no permitidos.')
  const cambio: CambioComunidad = { version: entrada.version, accion }
  if (accion === 'editar') {
    cambio.contenido = normalizarTextoComunidad(entrada.contenido, comentario ? LIMITE_COMENTARIO_COMUNIDAD : LIMITE_PUBLICACION_COMUNIDAD)
    if (!comentario) {
      if (!tipoValido(entrada.tipo)) throw new Error('Elegí qué querés compartir.')
      cambio.tipo = entrada.tipo
    }
  }
  if (accion === 'ocultar') {
    const motivo = normalizarTextoComunidad(entrada.motivo, 300)
    if (motivo.length < 5) throw new Error('Indicá un motivo de al menos 5 caracteres para ocultarlo.')
    cambio.motivo = motivo
  }
  return cambio
}
export function validarFelicitacion(valor: unknown) {
  const entrada = campos(valor, ['activo'])
  if (typeof entrada.activo !== 'boolean') throw new Error('Revisá la felicitación antes de intentar nuevamente.')
  return entrada.activo
}

// Se conserva la fracción de segundo de Postgres: convertir a ISO mediante Date
// perdería microsegundos y podría saltar filas al paginar.
function fechaValida(valor: unknown): valor is string {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(valor)) return false
  const fecha = new Date(valor)
  if (!Number.isFinite(fecha.getTime())) return false
  const dia = valor.slice(0, 10), utc = new Date(dia + 'T00:00:00Z')
  return Number.isFinite(utc.getTime()) && utc.toISOString().slice(0, 10) === dia
}
export function leerCursorComunidad(valor: unknown): { fecha: string; id: string } | null {
  if (valor === undefined || valor === null) return null
  if (typeof valor !== 'string' || valor.length > 100) throw new Error('La página solicitada no es válida.')
  const partes = valor.split('~')
  if (partes.length !== 2 || !fechaValida(partes[0]) || !idComunidadValido(partes[1])) throw new Error('La página solicitada no es válida.')
  return { fecha: partes[0], id: partes[1].toLowerCase() }
}
export function cursorComunidad(fila: { created_at: string; id: string }) { return `${fila.created_at}~${fila.id}` }
export interface FiltroComunidad { tipo?: TipoPublicacionComunidad; vista: VistaComunidad; cursor?: string }
export function validarFiltrosComunidad(params: URLSearchParams): FiltroComunidad {
  if ([...params.keys()].some(campo => !['tipo', 'vista', 'cursor'].includes(campo)) || ['tipo', 'vista', 'cursor'].some(campo => params.getAll(campo).length > 1)) throw new Error('Revisá los filtros de la comunidad.')
  const tipo = params.get('tipo') ?? undefined, vista = params.get('vista') ?? 'todas', cursor = params.get('cursor') ?? undefined
  if (tipo !== undefined && !tipoValido(tipo)) throw new Error('El tipo de publicación no es válido.')
  if (!['todas', 'mias', 'ocultas', 'retiradas'].includes(vista)) throw new Error('La vista solicitada no es válida.')
  leerCursorComunidad(cursor)
  return { tipo: tipo as TipoPublicacionComunidad | undefined, vista: vista as VistaComunidad, cursor }
}
export function validarFiltroComentarios(params: URLSearchParams) {
  if ([...params.keys()].some(campo => campo !== 'cursor') || params.getAll('cursor').length > 1) throw new Error('Revisá la página de comentarios.')
  const cursor = params.get('cursor') ?? undefined
  leerCursorComunidad(cursor)
  return cursor
}

function esAutor(valor: unknown): valor is AutorComunidad {
  return objeto(valor) && Object.keys(valor).every(campo => ['nombre', 'avatar_url', 'es_admin'].includes(campo)) &&
    (valor.nombre === null || typeof valor.nombre === 'string' && [...valor.nombre].length <= 200) && valor.avatar_url === null && typeof valor.es_admin === 'boolean'
}
function esTexto(valor: unknown): valor is TextoComunidad {
  return objeto(valor) && idComunidadValido(valor.id) && typeof valor.contenido === 'string' && valor.contenido.length > 0 &&
    fechaValida(valor.created_at) && fechaValida(valor.actualizado_at) && versionValida(valor.version) &&
    typeof valor.retirada === 'boolean' && typeof valor.oculta === 'boolean' && typeof valor.propia === 'boolean' && esAutor(valor.autor)
}
const camposTexto = ['id', 'contenido', 'created_at', 'actualizado_at', 'version', 'retirada', 'oculta', 'propia', 'autor']
function conteoValido(valor: unknown): valor is number { return typeof valor === 'number' && Number.isSafeInteger(valor) && valor >= 0 }
export function esPublicacionComunidad(valor: unknown): valor is PublicacionComunidad {
  return esTexto(valor) && objeto(valor) && Object.keys(valor).every(campo => [...camposTexto, 'tipo', 'total_comentarios', 'total_felicitaciones', 'felicitada'].includes(campo)) &&
    [...valor.contenido].length <= LIMITE_PUBLICACION_COMUNIDAD && tipoValido(valor.tipo) && conteoValido(valor.total_comentarios) && conteoValido(valor.total_felicitaciones) && typeof valor.felicitada === 'boolean'
}
export function esComentarioComunidad(valor: unknown): valor is ComentarioComunidad {
  return esTexto(valor) && objeto(valor) && Object.keys(valor).every(campo => [...camposTexto, 'publicacion_id'].includes(campo)) &&
    [...valor.contenido].length <= LIMITE_COMENTARIO_COMUNIDAD && idComunidadValido(valor.publicacion_id)
}
function cursorPaginaValido(valor: unknown) { try { return valor === null || typeof valor === 'string' && Boolean(leerCursorComunidad(valor)) } catch { return false } }
export function esPaginaComunidad(valor: unknown): valor is PaginaComunidad {
  if (!objeto(valor)) return false
  if (valor.estado === 'error') return Object.keys(valor).every(campo => ['estado', 'mensaje'].includes(campo)) && typeof valor.mensaje === 'string'
  return valor.estado === 'lista' && Object.keys(valor).every(campo => ['estado', 'publicaciones', 'siguiente'].includes(campo)) && Array.isArray(valor.publicaciones) &&
    valor.publicaciones.length <= TAMANO_PAGINA_COMUNIDAD && valor.publicaciones.every(esPublicacionComunidad) && new Set(valor.publicaciones.map(p => p.id)).size === valor.publicaciones.length && cursorPaginaValido(valor.siguiente)
}
export function esPaginaComentarios(valor: unknown): valor is PaginaComentarios {
  if (!objeto(valor)) return false
  if (valor.estado === 'error') return Object.keys(valor).every(campo => ['estado', 'mensaje'].includes(campo)) && typeof valor.mensaje === 'string'
  return valor.estado === 'lista' && Object.keys(valor).every(campo => ['estado', 'comentarios', 'siguiente'].includes(campo)) && Array.isArray(valor.comentarios) &&
    valor.comentarios.length <= TAMANO_PAGINA_COMUNIDAD && valor.comentarios.every(esComentarioComunidad) && new Set(valor.comentarios.map(c => c.id)).size === valor.comentarios.length && cursorPaginaValido(valor.siguiente)
}
export const esPaginaComentariosComunidad = esPaginaComentarios
