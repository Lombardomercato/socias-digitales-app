import { CATEGORIAS_DIA, fechaDiaValida, resumenTareas, type ResumenDia, type TareaDia } from './my-day'

export type ResumenMiDiaInicio = {
  estado: 'listo'
  fecha: string
  total: number
  completadas: number
  pendientes: number
  proximas: { id: string; texto: string }[]
} | { estado: 'error' } | { estado: 'no-habilitado' }

export interface DatosMiDiaInicio {
  tareas: TareaDia[]
  semana: ResumenDia[]
  limitado: boolean
  errorCarga: boolean
}

const camposConteo = ['total', 'completadas', 'generales', 'generales_completadas', 'negocio', 'negocio_completadas'] as const
type ConteosDia = Pick<ResumenDia, typeof camposConteo[number]>

function entero(valor: unknown): number | null {
  if (typeof valor !== 'number' && (typeof valor !== 'string' || !/^(0|[1-9]\d*)$/.test(valor))) return null
  const numero = Number(valor)
  return Number.isSafeInteger(numero) && numero >= 0 ? numero : null
}

function leerConteos(fila: ResumenDia): ConteosDia | null {
  const valores = camposConteo.map(campo => entero(fila[campo]))
  if (valores.some(valor => valor === null)) return null
  const [total, completadas, generales, generalesCompletadas, negocio, negocioCompletadas] = valores as number[]
  if (completadas > total || generalesCompletadas > generales || negocioCompletadas > negocio || generales + negocio !== total || generalesCompletadas + negocioCompletadas !== completadas) return null
  return { total, completadas, generales, generales_completadas: generalesCompletadas, negocio, negocio_completadas: negocioCompletadas }
}

// Usa la lectura existente del día. Los textos nunca se mezclan entre cuentas
// y el resultado no incorpora perfil, categorías, versiones ni datos de la RPC.
export function resumirMiDiaInicio(datos: DatosMiDiaInicio, userId: string, fecha: string): ResumenMiDiaInicio {
  if (!userId || !fechaDiaValida(fecha) || !datos || datos.errorCarga !== false || typeof datos.limitado !== 'boolean' || !Array.isArray(datos.tareas) || !Array.isArray(datos.semana)) return { estado: 'error' }
  const activas: TareaDia[] = []
  const ids = new Set<string>()
  for (const tarea of datos.tareas) {
    if (!tarea || typeof tarea.alumna_id !== 'string') return { estado: 'error' }
    if (tarea.alumna_id !== userId) continue
    if (!fechaDiaValida(tarea.fecha)) return { estado: 'error' }
    if (tarea.fecha !== fecha) continue
    if (typeof tarea.id !== 'string' || !tarea.id.trim() || ids.has(tarea.id) || typeof tarea.archivada !== 'boolean') return { estado: 'error' }
    ids.add(tarea.id)
    if (tarea.archivada) continue
    if (typeof tarea.completada !== 'boolean' || typeof tarea.texto !== 'string' || !tarea.texto.trim() || tarea.texto.length > 300 || !Object.hasOwn(CATEGORIAS_DIA, tarea.categoria)) return { estado: 'error' }
    activas.push(tarea)
  }

  let agregado: ConteosDia | null = null
  for (const fila of datos.semana) {
    if (!fila || typeof fila.alumna_id !== 'string') return { estado: 'error' }
    if (fila.alumna_id !== userId) continue
    if (!fechaDiaValida(fila.fecha)) return { estado: 'error' }
    if (fila.fecha !== fecha) continue
    if (agregado) return { estado: 'error' }
    agregado = leerConteos(fila)
    if (!agregado) return { estado: 'error' }
  }

  const observados = resumenTareas(activas, fecha)
  if (!agregado) {
    // La RPC agrupa solo días con tareas activas. Una lista completa vacía
    // confirma cero; una lectura recortada o con tareas no permite inferirlo.
    if (datos.limitado || activas.length > 0) return { estado: 'error' }
    agregado = observados
  } else {
    for (const campo of camposConteo) {
      if (datos.limitado ? agregado[campo] < observados[campo] : agregado[campo] !== observados[campo]) return { estado: 'error' }
    }
    if (datos.limitado && (
      agregado.total - agregado.completadas < observados.total - observados.completadas
      || agregado.generales - agregado.generales_completadas < observados.generales - observados.generales_completadas
      || agregado.negocio - agregado.negocio_completadas < observados.negocio - observados.negocio_completadas
    )) return { estado: 'error' }
  }
  return {
    estado: 'listo', fecha, total: agregado.total, completadas: agregado.completadas,
    pendientes: agregado.total - agregado.completadas,
    // Conserva el orden del lector (creación/ID), no inventa prioridad u hora.
    proximas: activas.filter(tarea => !tarea.completada).slice(0, 3).map(tarea => ({ id: tarea.id, texto: tarea.texto })),
  }
}
