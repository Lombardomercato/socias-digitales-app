export const ORIENTACIONES_RECURSO = { marca_personal: 'Marca personal', sin_mostrarse: 'Sin mostrarse', ambas: 'Ambas' } as const
export const FUENTES_CRM = { manual: 'Manual', manychat: 'ManyChat', sndflow: 'SendFlow', otra: 'Otra' } as const
export const SEGMENTOS_CAMARA = { si: 'Sí quiere mostrarse', no: 'No quiere mostrarse', sin_definir: 'Sin definir' } as const
export const TIPOS_EVENTO_CRM = { solicitud: 'Solicitud de recurso', clic: 'Clic observado', entrega_iniciada: 'Entrega iniciada', info_socias: 'Pidió información de Socias', interes_vigente: 'Interés vigente confirmado' } as const
export type OrientacionRecurso = keyof typeof ORIENTACIONES_RECURSO
export type FuenteCrm = keyof typeof FUENTES_CRM
export type SegmentoCamara = keyof typeof SEGMENTOS_CAMARA
export type TipoEventoCrm = keyof typeof TIPOS_EVENTO_CRM
export interface RecursoCrm { id: string; nombre: string; slug: string; orientacion: OrientacionRecurso; url: string | null; estado: 'borrador'; version: number; creado_en: string; actualizado_en: string }
export interface ContactoCrm {
  id: string; nombre: string; email_normalizado: string | null; telefono: string | null; fuente: FuenteCrm; referencia_externa: string | null
  segmento_camara: SegmentoCamara; perfil_id: string | null; vinculo_confirmado_en: string | null; cliente_confirmado: boolean; version: number; creado_en: string; actualizado_en: string
}
export interface EventoCrm { id: string; contacto_id: string; recurso_id: string | null; tipo: TipoEventoCrm; fuente: FuenteCrm; referencia_externa: string | null; observado_en: string; creado_en: string }
export interface SenalesCrm { recursos_distintos: number; pidio_info: boolean; interes_vigente_en: string | null }
export interface InteresComercialCrm { puntos: number; recursos: number; informacion: number; vigente: number }
export interface ContactoResumenCrm extends ContactoCrm { senales: SenalesCrm; interes: InteresComercialCrm }
export type CatalogoCrm = { estado: 'lista'; recursos: RecursoCrm[]; limitado: boolean } | { estado: 'error'; mensaje: string }
export type ListaContactosCrm = { estado: 'lista'; contactos: ContactoResumenCrm[]; siguiente: string | null } | { estado: 'error'; mensaje: string }
export type HistorialCrm = { estado: 'lista'; contacto: ContactoResumenCrm; eventos: EventoCrm[]; siguiente: string | null } | { estado: 'error'; mensaje: string }
export interface FiltrosContactosCrm { fuente?: FuenteCrm; segmento?: SegmentoCamara; relacion?: 'sin_vinculo' | 'vinculada' | 'cliente'; cursor?: string }
const UUID_CRM = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
export function idCrmValido(x: unknown): x is string { return typeof x === 'string' && UUID_CRM.test(x) }
function objeto(x: unknown): x is Record<string, unknown> { return Boolean(x && typeof x === 'object' && !Array.isArray(x)) }
function campos(x: unknown, permitidos: string[]) { if (!objeto(x) || Object.keys(x).some(k => !permitidos.includes(k))) throw new Error('El envío contiene datos no permitidos.'); return x }
function opcion<T extends object>(valor: unknown, opciones: T): valor is keyof T { return typeof valor === 'string' && Object.hasOwn(opciones, valor) }
function texto(x: unknown, max: number) { if (typeof x !== 'string') throw new Error('Revisá los datos del formulario.'); const v = x.normalize('NFC').trim().replace(/\s+/g, ' '); if (!v || [...v].length > max || /[\u0000-\u001f\u007f]/.test(v)) throw new Error(`Usá entre 1 y ${max} caracteres.`); return v }
function opcional(x: unknown, max: number) { return x === undefined || x === null || x === '' ? null : texto(x, max) }
function version(x: unknown): x is number { return typeof x === 'number' && Number.isSafeInteger(x) && x >= 1 && x <= 1e9 }
export function urlRecursoCrm(valor: unknown) {
  const x = opcional(valor, 2000)
  if (!x) return null
  try { const u = new URL(x); if (u.protocol !== 'https:' || u.username || u.password || !u.hostname) throw new Error(); return u.toString() } catch { throw new Error('El enlace debe ser HTTPS y no incluir credenciales.') }
}
export function validarRecursoCrm(valor: unknown, editar = false) {
  const x = campos(valor, editar ? ['id', 'version', 'nombre', 'slug', 'orientacion', 'url'] : ['id', 'nombre', 'slug', 'orientacion', 'url'])
  if (!idCrmValido(x.id) || editar && !version(x.version)) throw new Error('Actualizá el recurso antes de editarlo.')
  const nombre = texto(x.nombre, 120), slug = texto(x.slug, 100).toLowerCase()
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('El identificador usa letras sin acentos, números y guiones.')
  if (!opcion(x.orientacion, ORIENTACIONES_RECURSO)) throw new Error('Elegí la orientación del recurso.')
  return { id: x.id.toLowerCase(), ...(editar ? { version: x.version as number } : {}), datos: { nombre, slug, orientacion: x.orientacion, url: urlRecursoCrm(x.url), estado: 'borrador' as const } }
}
export function validarContactoCrm(valor: unknown) {
  const x = campos(valor, ['id', 'nombre', 'email', 'telefono', 'fuente', 'referencia_externa', 'segmento_camara'])
  if (!idCrmValido(x.id)) throw new Error('El identificador del contacto no es válido.')
  const nombre = texto(x.nombre, 120), email = opcional(x.email, 254)?.toLowerCase() ?? null, telefonoRaw = opcional(x.telefono, 35)
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Revisá el email del contacto.')
  if (telefonoRaw && !/^\+?[\d ()-]+$/.test(telefonoRaw)) throw new Error('Revisá el teléfono del contacto.')
  const telefono = telefonoRaw?.replace(/[ ()-]/g, '') ?? null
  if (telefono && !/^\+?\d{7,15}$/.test(telefono)) throw new Error('El teléfono debe tener entre 7 y 15 dígitos.')
  if (!email && !telefono) throw new Error('Completá un email o un teléfono para identificar el contacto.')
  if (!opcion(x.fuente, FUENTES_CRM) || !opcion(x.segmento_camara, SEGMENTOS_CAMARA)) throw new Error('Revisá la fuente y el segmento del contacto.')
  return { id: x.id.toLowerCase(), datos: { nombre, email_normalizado: email, telefono, fuente: x.fuente, referencia_externa: opcional(x.referencia_externa, 200), segmento_camara: x.segmento_camara } }
}
export function validarSegmentoCrm(valor: unknown) {
  const x = campos(valor, ['version', 'segmento_camara'])
  if (!version(x.version) || !opcion(x.segmento_camara, SEGMENTOS_CAMARA)) throw new Error('Actualizá el contacto y revisá el segmento.')
  return { version: x.version, segmento_camara: x.segmento_camara }
}
export function validarEventoCrm(valor: unknown, ahora = new Date()) {
  const x = campos(valor, ['id', 'tipo', 'recurso_id', 'fuente', 'referencia_externa', 'observado_en'])
  if (!idCrmValido(x.id) || !opcion(x.tipo, TIPOS_EVENTO_CRM) || !opcion(x.fuente, FUENTES_CRM)) throw new Error('Revisá la señal observada y su fuente.')
  const recurso = x.recurso_id === null || x.recurso_id === undefined || x.recurso_id === '' ? null : x.recurso_id
  if (recurso !== null && !idCrmValido(recurso) || ['solicitud', 'clic', 'entrega_iniciada'].includes(x.tipo) && recurso === null) throw new Error('Elegí el recurso relacionado con esta señal.')
  const fecha = typeof x.observado_en === 'string' ? new Date(x.observado_en) : new Date(NaN)
  if (!Number.isFinite(fecha.getTime()) || fecha < new Date('2000-01-01T00:00:00Z') || fecha.getTime() > ahora.getTime()) throw new Error('La fecha debe corresponder a una observación real, no futura.')
  return { id: x.id.toLowerCase(), datos: { tipo: x.tipo, recurso_id: recurso as string | null, fuente: x.fuente, referencia_externa: opcional(x.referencia_externa, 200), observado_en: fecha.toISOString() } }
}
export function calcularInteresCrm(senales: SenalesCrm, ahora = new Date()): InteresComercialCrm {
  if (!Number.isSafeInteger(senales.recursos_distintos) || senales.recursos_distintos < 0 || typeof senales.pidio_info !== 'boolean') throw new Error('No pudimos comprobar las señales comerciales.')
  const fecha = senales.interes_vigente_en ? new Date(senales.interes_vigente_en) : null
  if (fecha && !Number.isFinite(fecha.getTime())) throw new Error('No pudimos comprobar la fecha de interés.')
  const recursos = Math.min(3, senales.recursos_distintos) * 10, informacion = senales.pidio_info ? 40 : 0
  const vigente = fecha && fecha.getTime() <= ahora.getTime() && fecha.getTime() >= ahora.getTime() - 30 * 86400000 ? 10 : 0
  return { puntos: recursos + informacion + vigente, recursos, informacion, vigente }
}
export function etiquetaRelacionCrm(contacto: Pick<ContactoCrm, 'perfil_id' | 'vinculo_confirmado_en' | 'cliente_confirmado'>) {
  if (!contacto.perfil_id || !contacto.vinculo_confirmado_en) return 'Sin vínculo confirmado'
  return contacto.cliente_confirmado ? 'Cliente confirmado' : 'Perfil vinculado'
}
export function cursorCrm(fila: { creado_en: string; id: string }) { return `${fila.creado_en}~${fila.id}` }
export function validarCursorCrm(valor: unknown) {
  if (valor === undefined || valor === null) return null
  if (typeof valor !== 'string') throw new Error('La página solicitada no es válida.')
  const partes = valor.split('~')
  if (partes.length !== 2 || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(partes[0]) || !Number.isFinite(Date.parse(partes[0])) || !idCrmValido(partes[1])) throw new Error('La página solicitada no es válida.')
  return { fecha: partes[0], id: partes[1].toLowerCase() }
}
export function filtrosContactosCrm(params: URLSearchParams): FiltrosContactosCrm {
  if ([...params.keys()].some(k => !['fuente', 'segmento', 'relacion', 'cursor'].includes(k)) || [...new Set(params.keys())].some(k => params.getAll(k).length > 1)) throw new Error('Revisá los filtros de contactos.')
  const fuente = params.get('fuente') ?? undefined, segmento = params.get('segmento') ?? undefined, relacion = params.get('relacion') ?? undefined, cursor = params.get('cursor') ?? undefined
  if (fuente !== undefined && !opcion(fuente, FUENTES_CRM) || segmento !== undefined && !opcion(segmento, SEGMENTOS_CAMARA) || relacion !== undefined && !['sin_vinculo', 'vinculada', 'cliente'].includes(relacion)) throw new Error('Revisá los filtros de contactos.')
  validarCursorCrm(cursor)
  return { fuente: fuente as FuenteCrm | undefined, segmento: segmento as SegmentoCamara | undefined, relacion: relacion as FiltrosContactosCrm['relacion'], cursor }
}
export function esRecursoCrm(valor: unknown): valor is RecursoCrm { if (!objeto(valor)) return false; try { validarRecursoCrm({ id: valor.id, version: valor.version, nombre: valor.nombre, slug: valor.slug, orientacion: valor.orientacion, url: valor.url }, true); return valor.estado === 'borrador' && typeof valor.creado_en === 'string' && typeof valor.actualizado_en === 'string' } catch { return false } }
export function esContactoCrm(valor: unknown): valor is ContactoCrm {
  if (!objeto(valor)) return false
  try {
    validarContactoCrm({ id: valor.id, nombre: valor.nombre, email: valor.email_normalizado, telefono: valor.telefono, fuente: valor.fuente, referencia_externa: valor.referencia_externa, segmento_camara: valor.segmento_camara })
    return version(valor.version) && (valor.perfil_id === null || idCrmValido(valor.perfil_id)) && (valor.vinculo_confirmado_en === null || typeof valor.vinculo_confirmado_en === 'string') && typeof valor.cliente_confirmado === 'boolean' && (!valor.cliente_confirmado || Boolean(valor.perfil_id && valor.vinculo_confirmado_en)) && typeof valor.creado_en === 'string' && typeof valor.actualizado_en === 'string'
  } catch { return false }
}
export function esContactoResumenCrm(valor: unknown): valor is ContactoResumenCrm {
  if (!esContactoCrm(valor) || !objeto(valor) || !objeto(valor.senales) || !objeto(valor.interes)) return false
  const s = valor.senales, i = valor.interes
  if (typeof s.recursos_distintos !== 'number' || !Number.isSafeInteger(s.recursos_distintos) || s.recursos_distintos < 0 || typeof s.pidio_info !== 'boolean' || !(s.interes_vigente_en === null || typeof s.interes_vigente_en === 'string' && Number.isFinite(Date.parse(s.interes_vigente_en)))) return false
  return i.recursos === Math.min(3, s.recursos_distintos) * 10 && i.informacion === (s.pidio_info ? 40 : 0) && (i.vigente === 0 || i.vigente === 10) && i.puntos === Number(i.recursos) + Number(i.informacion) + Number(i.vigente)
}
export function esEventoCrm(valor: unknown): valor is EventoCrm {
  if (!objeto(valor) || !idCrmValido(valor.contacto_id) || typeof valor.creado_en !== 'string' || !Number.isFinite(Date.parse(valor.creado_en))) return false
  try { validarEventoCrm({ id: valor.id, tipo: valor.tipo, recurso_id: valor.recurso_id, fuente: valor.fuente, referencia_externa: valor.referencia_externa, observado_en: valor.observado_en }, new Date(Date.now() + 60000)); return true } catch { return false }
}
