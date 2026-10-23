import { fechaDiaValida, semanaDia, type ResumenDia } from './my-day'

export interface DiaSemana {
  fecha: string
  total: number | null
  completadas: number | null
  pendientes: number | null
}
export interface ResumenSemana {
  estado: 'listo' | 'error'
  desde: string | null
  hasta: string | null
  total: number | null
  completadas: number | null
  pendientes: number | null
  diasConTareas: number | null
  dias: DiaSemana[]
}

function entero(valor: unknown): number | null {
  if (typeof valor !== 'number' && (typeof valor !== 'string' || !/^(0|[1-9]\d*)$/.test(valor))) return null
  const numero = Number(valor)
  return Number.isSafeInteger(numero) && numero >= 0 ? numero : null
}

// El llamador conserva el filtro de cuenta y permiso de Mi día. Este resumen
// solo proyecta sus agregados: no recibe textos, no guarda tareas ni agrega PII.
export function resumirSemana(semana: ResumenDia[], fecha: string, error = false): ResumenSemana {
  const fechas = fechaDiaValida(fecha) ? semanaDia(fecha) : []
  const diasValidos = fechas.length === 7 && fechas.every(fechaDiaValida) ? fechas : []
  const desconocido = (): ResumenSemana => ({
    estado: 'error', desde: diasValidos[0] ?? null, hasta: diasValidos[6] ?? null,
    total: null, completadas: null, pendientes: null, diasConTareas: null,
    dias: diasValidos.map(dia => ({ fecha: dia, total: null, completadas: null, pendientes: null })),
  })
  if (error || !Array.isArray(semana) || !diasValidos.length) return desconocido()
  const porFecha = new Map<string, { total: number; completadas: number }>()
  for (const fila of semana) {
    if (!fila || !fechaDiaValida(fila.fecha)) return desconocido()
    if (fila.fecha < diasValidos[0] || fila.fecha > diasValidos[6]) continue
    if (porFecha.has(fila.fecha)) return desconocido()
    const total = entero(fila.total), completadas = entero(fila.completadas)
    const generales = entero(fila.generales), generalesCompletadas = entero(fila.generales_completadas)
    const negocio = entero(fila.negocio), negocioCompletadas = entero(fila.negocio_completadas)
    if (total === null || completadas === null || generales === null || generalesCompletadas === null || negocio === null || negocioCompletadas === null
      || completadas > total || generalesCompletadas > generales || negocioCompletadas > negocio
      || generales + negocio !== total || generalesCompletadas + negocioCompletadas !== completadas) return desconocido()
    porFecha.set(fila.fecha, { total, completadas })
  }
  const dias = diasValidos.map(dia => {
    const datos = porFecha.get(dia) ?? { total: 0, completadas: 0 }
    return { fecha: dia, ...datos, pendientes: datos.total - datos.completadas }
  })
  const total = dias.reduce((s, dia) => s + dia.total, 0), completadas = dias.reduce((s, dia) => s + dia.completadas, 0)
  if (!Number.isSafeInteger(total) || !Number.isSafeInteger(completadas)) return desconocido()
  return { estado: 'listo', desde: diasValidos[0], hasta: diasValidos[6], total, completadas, pendientes: total - completadas, diasConTareas: dias.filter(dia => dia.total > 0).length, dias }
}
