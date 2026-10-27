import 'server-only'
import { unstable_rethrow } from 'next/navigation'
import { createClient } from './supabase/server'
import { origenMetricasPermitido } from './metrics'
import { calcularInteresCrm, cursorCrm, esContactoCrm, esEventoCrm, esRecursoCrm, validarCursorCrm,
  type CatalogoCrm, type ContactoCrm, type ContactoResumenCrm, type EventoCrm, type FiltrosContactosCrm, type HistorialCrm, type ListaContactosCrm, type RecursoCrm,
  type validarContactoCrm, type validarEventoCrm, type validarRecursoCrm, type validarSegmentoCrm } from './resource-crm'
type Cliente = Awaited<ReturnType<typeof createClient>>
export interface SesionRecursosCrm { supabase: Cliente; userId: string }
export class ErrorRecursosCrm extends Error { constructor(public status: number, mensaje: string) { super(mensaje) } }
export async function autorizarRecursosCrm(): Promise<SesionRecursosCrm | { error: { status: number; mensaje: string } }> {
  try {
    const supabase = await createClient(), { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return { error: { status: 401, mensaje: 'Iniciá sesión para entrar al panel.' } }
    const perfil = await supabase.from('perfiles').select('id,rol').eq('id', user.id).maybeSingle()
    if (perfil.error || !perfil.data || perfil.data.id !== user.id) return { error: { status: 503, mensaje: 'No pudimos comprobar tu acceso.' } }
    if (perfil.data.rol !== 'admin') return { error: { status: 403, mensaje: 'Recursos y contactos está reservado al equipo de Flor.' } }
    return { supabase, userId: user.id }
  } catch (error) { unstable_rethrow(error); return { error: { status: 503, mensaje: 'No pudimos comprobar tu acceso.' } } }
}
const CAMPOS_RECURSO = 'id,nombre,slug,orientacion,url,estado,version,creado_en,actualizado_en'
const CAMPOS_CONTACTO = 'id,nombre,email_normalizado,telefono,fuente,referencia_externa,segmento_camara,perfil_id,vinculo_confirmado_en,cliente_confirmado,version,creado_en,actualizado_en'
const CAMPOS_EVENTO = 'id,contacto_id,recurso_id,tipo,fuente,referencia_externa,observado_en,creado_en'
const noDisponible = () => new ErrorRecursosCrm(503, 'No pudimos cargar los registros. Volvé a intentar; no se muestran cifras parciales.')
function recursoDto(row: RecursoCrm): RecursoCrm {
  const r = { id: row.id, nombre: row.nombre, slug: row.slug, orientacion: row.orientacion, url: row.url, estado: row.estado, version: row.version, creado_en: row.creado_en, actualizado_en: row.actualizado_en }
  if (!esRecursoCrm(r)) throw noDisponible()
  return r
}
function contactoDto(row: ContactoCrm): ContactoCrm {
  const c = { id: row.id, nombre: row.nombre, email_normalizado: row.email_normalizado, telefono: row.telefono, fuente: row.fuente, referencia_externa: row.referencia_externa, segmento_camara: row.segmento_camara, perfil_id: row.perfil_id, vinculo_confirmado_en: row.vinculo_confirmado_en, cliente_confirmado: row.cliente_confirmado, version: row.version, creado_en: row.creado_en, actualizado_en: row.actualizado_en }
  if (!esContactoCrm(c)) throw noDisponible()
  return c
}
async function resumirContactos(auth: SesionRecursosCrm, filas: ContactoCrm[]): Promise<ContactoResumenCrm[]> {
  if (!filas.length) return []
  const { data, error } = await auth.supabase.rpc('resumen_crm_contactos', { p_ids: filas.map(c => c.id) })
  if (error || !Array.isArray(data)) throw noDisponible()
  const resumen = new Map<string, ContactoResumenCrm['senales']>()
  for (const s of data) {
    const n = typeof s.recursos_distintos === 'number' || typeof s.recursos_distintos === 'string' && /^\d+$/.test(s.recursos_distintos) ? Number(s.recursos_distintos) : NaN
    if (!filas.some(c => c.id === s.contacto_id) || resumen.has(s.contacto_id) || !Number.isSafeInteger(n) || n < 0 || typeof s.pidio_info !== 'boolean' || !(s.interes_vigente_en === null || typeof s.interes_vigente_en === 'string')) throw noDisponible()
    resumen.set(s.contacto_id, { recursos_distintos: n, pidio_info: s.pidio_info, interes_vigente_en: s.interes_vigente_en })
  }
  if (resumen.size !== filas.length) throw noDisponible()
  return filas.map(f => { const senales = resumen.get(f.id)!; return { ...contactoDto(f), senales, interes: calcularInteresCrm(senales) } })
}
export async function leerCatalogoCrm(auth: SesionRecursosCrm): Promise<CatalogoCrm> {
  try {
    const { data, error } = await auth.supabase.from('crm_recursos').select(CAMPOS_RECURSO).order('creado_en', { ascending: false }).order('id', { ascending: false }).limit(201)
    if (error || !Array.isArray(data)) throw noDisponible()
    return { estado: 'lista', recursos: data.slice(0, 200).map(recursoDto), limitado: data.length > 200 }
  } catch (error) { unstable_rethrow(error); return { estado: 'error', mensaje: 'No pudimos cargar el catálogo. Volvé a intentar.' } }
}
export async function leerContactosCrm(auth: SesionRecursosCrm, filtros: FiltrosContactosCrm = {}): Promise<ListaContactosCrm> {
  try {
    let query = auth.supabase.from('crm_contactos').select(CAMPOS_CONTACTO).order('creado_en', { ascending: false }).order('id', { ascending: false }).limit(26)
    if (filtros.fuente) query = query.eq('fuente', filtros.fuente)
    if (filtros.segmento) query = query.eq('segmento_camara', filtros.segmento)
    if (filtros.relacion === 'sin_vinculo') query = query.is('vinculo_confirmado_en', null)
    if (filtros.relacion === 'vinculada') query = query.not('vinculo_confirmado_en', 'is', null).eq('cliente_confirmado', false)
    if (filtros.relacion === 'cliente') query = query.eq('cliente_confirmado', true).not('vinculo_confirmado_en', 'is', null)
    const cursor = validarCursorCrm(filtros.cursor)
    if (cursor) query = query.or(`creado_en.lt.${cursor.fecha},and(creado_en.eq.${cursor.fecha},id.lt.${cursor.id})`)
    const { data, error } = await query
    if (error || !Array.isArray(data)) throw noDisponible()
    const filas = data.slice(0, 25) as ContactoCrm[]
    return { estado: 'lista', contactos: await resumirContactos(auth, filas), siguiente: data.length > 25 ? cursorCrm(filas[filas.length - 1]) : null }
  } catch (error) { unstable_rethrow(error); return { estado: 'error', mensaje: 'No pudimos cargar contactos y señales. Volvé a intentar.' } }
}
async function buscarContacto(auth: SesionRecursosCrm, id: string) {
  const r = await auth.supabase.from('crm_contactos').select(CAMPOS_CONTACTO).eq('id', id).maybeSingle()
  if (r.error) throw noDisponible()
  return r.data ? contactoDto(r.data as ContactoCrm) : null
}
export async function leerHistorialCrm(auth: SesionRecursosCrm, id: string, siguiente?: string): Promise<HistorialCrm> {
  try {
    const contacto = await buscarContacto(auth, id)
    if (!contacto) return { estado: 'error', mensaje: 'El contacto ya no está disponible.' }
    let query = auth.supabase.from('crm_eventos').select(CAMPOS_EVENTO).eq('contacto_id', id).order('creado_en', { ascending: false }).order('id', { ascending: false }).limit(26)
    const cursor = validarCursorCrm(siguiente)
    if (cursor) query = query.or(`creado_en.lt.${cursor.fecha},and(creado_en.eq.${cursor.fecha},id.lt.${cursor.id})`)
    const [eventos, resumen] = await Promise.all([query, resumirContactos(auth, [contacto])])
    if (eventos.error || !Array.isArray(eventos.data)) throw noDisponible()
    const filas = eventos.data.slice(0, 25) as EventoCrm[]
    if (filas.some(e => e.contacto_id !== id || !esEventoCrm(e)) || new Set(filas.map(e => e.id)).size !== filas.length) throw noDisponible()
    return { estado: 'lista', contacto: resumen[0], eventos: filas.map(e => ({ id: e.id, contacto_id: e.contacto_id, recurso_id: e.recurso_id, tipo: e.tipo, fuente: e.fuente, referencia_externa: e.referencia_externa, observado_en: e.observado_en, creado_en: e.creado_en })), siguiente: eventos.data.length > 25 ? cursorCrm(filas[filas.length - 1]) : null }
  } catch (error) { unstable_rethrow(error); return { estado: 'error', mensaje: 'No pudimos cargar el historial del contacto.' } }
}
function falloGuardado(error: { code?: string } | null) {
  if (error?.code === '23505') return new ErrorRecursosCrm(409, 'Ya existe ese identificador o esa referencia de la fuente. Revisá los registros; no se fusionó ningún contacto.')
  if (error?.code === '42501') return new ErrorRecursosCrm(403, 'Tu acceso cambió. Volvé a ingresar al panel.')
  if (['23514', '22023', '23503'].includes(error?.code ?? '')) return new ErrorRecursosCrm(400, 'Revisá los datos y los registros relacionados.')
  return new ErrorRecursosCrm(503, 'No pudimos confirmar el guardado. Conservá el formulario y reintentá el mismo envío.')
}
export async function guardarRecursoCrm(auth: SesionRecursosCrm, entrada: ReturnType<typeof validarRecursoCrm>, editar = false): Promise<RecursoCrm> {
  const leer = () => auth.supabase.from('crm_recursos').select(CAMPOS_RECURSO).eq('id', entrada.id).maybeSingle()
  const anterior = await leer()
  if (anterior.error) throw noDisponible()
  const igual = (row: RecursoCrm | null) => row && Object.entries(entrada.datos).every(([k, v]) => row[k as keyof RecursoCrm] === v)
  if (anterior.data) {
    if (!editar && anterior.data.version === 1 && igual(anterior.data) || editar && anterior.data.version === Number(entrada.version) + 1 && igual(anterior.data)) return recursoDto(anterior.data)
    if (!editar || anterior.data.version !== entrada.version) throw new ErrorRecursosCrm(409, 'El recurso cambió o este envío ya existe. Actualizá el catálogo.')
  } else if (editar) throw new ErrorRecursosCrm(404, 'Recurso no disponible.')
  const query = editar ? auth.supabase.from('crm_recursos').update(entrada.datos).eq('id', entrada.id).eq('version', entrada.version!) : auth.supabase.from('crm_recursos').insert({ id: entrada.id, ...entrada.datos })
  const guardado = await query.select(CAMPOS_RECURSO).maybeSingle()
  const esperada = editar ? Number(entrada.version) + 1 : 1
  if (!guardado.error && guardado.data?.version === esperada && igual(guardado.data)) return recursoDto(guardado.data)
  const confirmada = await leer()
  if (!confirmada.error && confirmada.data?.version === esperada && igual(confirmada.data)) return recursoDto(confirmada.data)
  if (!guardado.error || confirmada.data && editar && confirmada.data.version !== entrada.version) throw new ErrorRecursosCrm(409, 'Otra persona editó el recurso. Abrí la última versión.')
  throw falloGuardado(guardado.error)
}
export async function crearContactoCrm(auth: SesionRecursosCrm, entrada: ReturnType<typeof validarContactoCrm>): Promise<ContactoResumenCrm> {
  const existente = await buscarContacto(auth, entrada.id)
  const igual = (c: ContactoCrm | null) => c && c.version === 1 && Object.entries(entrada.datos).every(([k, v]) => c[k as keyof ContactoCrm] === v)
  if (existente) { if (!igual(existente)) throw new ErrorRecursosCrm(409, 'Ese envío ya existe con otros datos.'); return (await resumirContactos(auth, [existente]))[0] }
  const { data, error } = await auth.supabase.from('crm_contactos').insert({ id: entrada.id, ...entrada.datos }).select(CAMPOS_CONTACTO).maybeSingle()
  if (!error && data && igual(data)) return (await resumirContactos(auth, [data]))[0]
  const confirmada = await buscarContacto(auth, entrada.id)
  if (igual(confirmada)) return (await resumirContactos(auth, [confirmada!]))[0]
  throw falloGuardado(error)
}
export async function segmentarContactoCrm(auth: SesionRecursosCrm, id: string, entrada: ReturnType<typeof validarSegmentoCrm>): Promise<ContactoResumenCrm> {
  const existente = await buscarContacto(auth, id)
  if (!existente) throw new ErrorRecursosCrm(404, 'Contacto no disponible.')
  const igual = (c: ContactoCrm | null) => c && c.version === entrada.version + 1 && c.segmento_camara === entrada.segmento_camara
  if (igual(existente)) return (await resumirContactos(auth, [existente]))[0]
  if (existente.version !== entrada.version) throw new ErrorRecursosCrm(409, 'El contacto cambió. Abrí su última versión.')
  const { data, error } = await auth.supabase.from('crm_contactos').update({ segmento_camara: entrada.segmento_camara }).eq('id', id).eq('version', entrada.version).select(CAMPOS_CONTACTO).maybeSingle()
  if (!error && data && igual(data)) return (await resumirContactos(auth, [data]))[0]
  const confirmada = await buscarContacto(auth, id)
  if (igual(confirmada)) return (await resumirContactos(auth, [confirmada!]))[0]
  if (!error || confirmada && confirmada.version !== entrada.version) throw new ErrorRecursosCrm(409, 'El contacto cambió. Abrí su última versión.')
  throw falloGuardado(error)
}
export async function registrarEventoCrm(auth: SesionRecursosCrm, contactoId: string, entrada: ReturnType<typeof validarEventoCrm>): Promise<EventoCrm> {
  if (!await buscarContacto(auth, contactoId)) throw new ErrorRecursosCrm(404, 'Contacto no disponible.')
  const leer = () => auth.supabase.from('crm_eventos').select(CAMPOS_EVENTO).eq('id', entrada.id).maybeSingle()
  const anterior = await leer()
  if (anterior.error) throw noDisponible()
  const igual = (e: EventoCrm | null) => e && e.contacto_id === contactoId && Object.entries(entrada.datos).every(([k, v]) => k === 'observado_en' ? Date.parse(e.observado_en) === Date.parse(v!) : e[k as keyof EventoCrm] === v)
  if (anterior.data) { if (!igual(anterior.data)) throw new ErrorRecursosCrm(409, 'Este envío ya existe con otros datos.'); return anterior.data }
  const { data, error } = await auth.supabase.from('crm_eventos').insert({ id: entrada.id, contacto_id: contactoId, ...entrada.datos }).select(CAMPOS_EVENTO).maybeSingle()
  if (!error && data && igual(data)) return data
  const confirmada = await leer()
  if (!confirmada.error && confirmada.data && igual(confirmada.data)) return confirmada.data
  throw falloGuardado(error)
}
const HEADERS_CRM = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' }
export function responderCrm(body: object, status = 200) { return Response.json(body, { status, headers: HEADERS_CRM }) }
export async function ejecutarCrm(request: Request, mutacion: boolean, operacion: (auth: SesionRecursosCrm) => Promise<Response>) {
  try {
    if (mutacion && !origenMetricasPermitido(request.headers.get('origin'), new URL(request.url).origin, request.headers.get('host'))) throw new ErrorRecursosCrm(403, 'Origen no permitido.')
    const auth = await autorizarRecursosCrm()
    if ('error' in auth) return responderCrm({ estado: 'error', error: auth.error.mensaje, mensaje: auth.error.mensaje }, auth.error.status)
    return await operacion(auth)
  } catch (error) { unstable_rethrow(error); const status = error instanceof ErrorRecursosCrm ? error.status : 503, mensaje = error instanceof ErrorRecursosCrm ? error.message : 'No pudimos confirmar la operación. Conservá tus cambios e intentá nuevamente.'; return responderCrm({ estado: 'error', error: mensaje, mensaje }, status) }
}
export function validarEntradaCrm<T>(fn: () => T): T { try { return fn() } catch (e) { throw new ErrorRecursosCrm(400, e instanceof Error ? e.message : 'Revisá el formulario.') } }
export async function leerJsonCrm(request: Request) {
  if (request.headers.get('content-type')?.split(';')[0].toLowerCase() !== 'application/json') throw new ErrorRecursosCrm(415, 'Solicitud no válida.')
  const lector = request.body?.getReader()
  if (!lector) throw new ErrorRecursosCrm(400, 'Revisá el formulario.')
  let total = 0, raw = ''; const decoder = new TextDecoder('utf-8', { fatal: true })
  try { while (true) { const parte = await lector.read(); if (parte.done) break; total += parte.value.byteLength; if (total > 16384) { await lector.cancel(); throw new ErrorRecursosCrm(413, 'Solicitud demasiado grande.') } raw += decoder.decode(parte.value, { stream: true }) } raw += decoder.decode(); return JSON.parse(raw) as unknown }
  catch (e) { if (e instanceof ErrorRecursosCrm) throw e; throw new ErrorRecursosCrm(400, 'Revisá el formulario.') } finally { lector.releaseLock() }
}
