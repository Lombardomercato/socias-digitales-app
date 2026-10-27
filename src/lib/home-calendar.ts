import type { HitoAgenda } from './agenda'
import { fechaDiaValida, moverDia, type ResumenDia } from './my-day'

export interface RangoCalendario {
  mes: string; etiqueta: string; desde: string; hasta: string
  anterior: string | null; siguiente: string | null; actual: string; mesCorregido: boolean
}
export interface DiaCalendario { fecha: string; total: number; completadas: number; pendientes: number }
export type TareasCalendario = { estado: 'lista'; dias: DiaCalendario[]; total: number; completadas: number; pendientes: number } | { estado: 'error' } | { estado: 'no-habilitado' }
export interface EncuentroCalendario { id: string; titulo: string; fecha: string; dia: string; hora: string; enlace: string | null; accion: string }
export type EncuentrosCalendario = { estado: 'lista'; encuentros: EncuentroCalendario[] } | { estado: 'error' }
export type CalendarioPersonal = { estado: 'listo'; rango: RangoCalendario; hoy: string; tareas: TareasCalendario; encuentros: EncuentrosCalendario } | { estado: 'error' }

function indiceMes(mes: string) { return Number(mes.slice(0, 4)) * 12 + Number(mes.slice(5, 7)) - 1 }
function desdeIndice(indice: number) { return `${Math.floor(indice / 12)}-${String(indice % 12 + 1).padStart(2, '0')}` }
export function nombreMesCalendario(mes: string) { return new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(`${mes}-01T12:00:00Z`)) }
export function resolverMesCalendario(solicitado: unknown, hoy: string): RangoCalendario {
  if (!fechaDiaValida(hoy)) throw new Error('La fecha actual no se pudo comprobar.')
  const actual = hoy.slice(0, 7), centro = indiceMes(actual)
  const minimo = Math.max(indiceMes('2000-01'), centro - 6), maximo = Math.min(indiceMes('2099-12'), centro + 6)
  const valido = typeof solicitado === 'string' && /^20\d{2}-(0[1-9]|1[0-2])$/.test(solicitado) && indiceMes(solicitado) >= minimo && indiceMes(solicitado) <= maximo
  const mes = valido ? solicitado : actual, indice = indiceMes(mes)
  const siguienteInicio = new Date(Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 1, 12))
  siguienteInicio.setUTCDate(0)
  return {
    mes, etiqueta: nombreMesCalendario(mes), desde: `${mes}-01`, hasta: siguienteInicio.toISOString().slice(0, 10),
    anterior: indice > minimo ? desdeIndice(indice - 1) : null, siguiente: indice < maximo ? desdeIndice(indice + 1) : null,
    actual, mesCorregido: solicitado !== undefined && !valido,
  }
}
export function fechasMesCalendario(rango: Pick<RangoCalendario, 'desde' | 'hasta'>) {
  if (!fechaDiaValida(rango.desde) || !fechaDiaValida(rango.hasta) || rango.desde.slice(0, 7) !== rango.hasta.slice(0, 7) || rango.desde > rango.hasta) return []
  const cantidad = Math.round((Date.parse(`${rango.hasta}T12:00:00Z`) - Date.parse(`${rango.desde}T12:00:00Z`)) / 86_400_000) + 1
  return Array.from({ length: cantidad }, (_, i) => moverDia(rango.desde, i))
}
function entero(valor: unknown): number | null {
  if (typeof valor !== 'number' && (typeof valor !== 'string' || !/^(0|[1-9]\d*)$/.test(valor))) return null
  const numero = Number(valor)
  return Number.isSafeInteger(numero) && numero >= 0 ? numero : null
}

// La RPC completa agrupa únicamente días con tareas activas. Un día ausente
// confirma cero SOLO después de una respuesta válida y sin error de esa RPC.
// Nunca se deducen planes de clases a partir del texto editable de una tarea.
export function resumirTareasCalendario(filas: unknown, usuariaId: string, rango: RangoCalendario, error = false): TareasCalendario {
  const fechas = fechasMesCalendario(rango)
  if (error || !usuariaId || !Array.isArray(filas) || !fechas.length || filas.length > fechas.length) return { estado: 'error' }
  const porFecha = new Map<string, DiaCalendario>()
  for (const valor of filas) {
    if (!valor || typeof valor !== 'object') return { estado: 'error' }
    const fila = valor as ResumenDia
    if (fila.alumna_id !== usuariaId || !fechaDiaValida(fila.fecha) || !fechas.includes(fila.fecha) || porFecha.has(fila.fecha)) return { estado: 'error' }
    const valores = [fila.total, fila.completadas, fila.generales, fila.generales_completadas, fila.negocio, fila.negocio_completadas].map(entero)
    if (valores.some(n => n === null)) return { estado: 'error' }
    const [total, completadas, generales, generalesCompletadas, negocio, negocioCompletadas] = valores as number[]
    if (completadas > total || generalesCompletadas > generales || negocioCompletadas > negocio || generales + negocio !== total || generalesCompletadas + negocioCompletadas !== completadas) return { estado: 'error' }
    porFecha.set(fila.fecha, { fecha: fila.fecha, total, completadas, pendientes: total - completadas })
  }
  const dias = fechas.map(fecha => porFecha.get(fecha) ?? { fecha, total: 0, completadas: 0, pendientes: 0 })
  const total = dias.reduce((suma, dia) => suma + dia.total, 0), completadas = dias.reduce((suma, dia) => suma + dia.completadas, 0)
  if (!Number.isSafeInteger(total) || !Number.isSafeInteger(completadas)) return { estado: 'error' }
  return { estado: 'lista', dias, total, completadas, pendientes: total - completadas }
}

// Recibe exclusivamente los hitos que Inicio ya autorizó para este perfil.
// La proyección no serializa audiencias, borradores, IDs de actor o auditoría.
export function proyectarEncuentrosCalendario(hitos: readonly HitoAgenda[], rango: RangoCalendario, error = false): EncuentrosCalendario {
  if (error || !Array.isArray(hitos) || hitos.length > 100) return { estado: 'error' }
  const ids = new Set<string>(), encuentros: EncuentroCalendario[] = []
  for (const hito of hitos) {
    if (!hito || typeof hito.id !== 'string' || !hito.id.trim() || hito.id.length > 150 || ids.has(hito.id) || typeof hito.titulo !== 'string' || !hito.titulo.trim() || hito.titulo.length > 120 || typeof hito.fecha !== 'string' || !/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(hito.fecha) || !fechaDiaValida(hito.fecha.slice(0, 10)) || Number(hito.fecha.slice(11, 13)) > 23 || Number(hito.fecha.slice(14, 16)) > 59 || Number(hito.fecha.slice(17, 19)) > 59 || !Number.isFinite(Date.parse(hito.fecha)) || typeof hito.accion !== 'string' || !hito.accion.trim() || hito.accion.length > 100) return { estado: 'error' }
    ids.add(hito.id)
    let enlace: string | null = null
    if (hito.enlace !== null) {
      if (typeof hito.enlace !== 'string' || hito.enlace.length > 2000) return { estado: 'error' }
      try {
        const url = new URL(hito.enlace)
        if (url.protocol !== 'https:' || url.username || url.password || !url.hostname.includes('.')) return { estado: 'error' }
        enlace = url.href
      } catch { return { estado: 'error' } }
    }
    const fecha = new Date(hito.fecha)
    const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Cordoba', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(fecha)
    const parte = (tipo: string) => partes.find(p => p.type === tipo)?.value ?? ''
    const dia = `${parte('year')}-${parte('month')}-${parte('day')}`
    if (dia < rango.desde || dia > rango.hasta) continue
    encuentros.push({ id: hito.id, titulo: hito.titulo.trim(), fecha: hito.fecha, dia, hora: new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Cordoba', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(fecha), enlace, accion: hito.accion.trim() })
  }
  encuentros.sort((a, b) => Date.parse(a.fecha) - Date.parse(b.fecha) || a.id.localeCompare(b.id))
  return { estado: 'lista', encuentros }
}
