import { calcularMetricas, claveCampana, ultimasMetricas, type Metrica } from './metrics'

export type CampanaMetricas = Pick<Metrica,
  'id' | 'alumna_id' | 'campana' | 'estrategia' | 'fecha' | 'actualizado_at' |
  'mensajes_recibidos' | 'personas_grupo' | 'reservas' | 'ventas' |
  'gasto_acumulado' | 'comision_producto'
> & {
  clave: string
  calculadas: ReturnType<typeof calcularMetricas> & {
    costoVenta: number | null
    conversionMensajesVentas: number | null
  }
}

export interface ComparacionCampanas {
  a: CampanaMetricas
  b: CampanaMetricas
  // A menos B. Las conversiones y el cierre son puntos porcentuales (pp),
  // nunca crecimiento relativo ni un juicio sobre cuál campaña es mejor.
  diferencias: {
    ventas: number
    gasto: number | null
    comisiones: number | null
    neto: number | null
    costoVenta: number | null
    conversionMensajesVentas: number | null
    cierre: number | null
  }
}

function porRecencia(a: Metrica, b: Metrica) {
  return b.fecha.localeCompare(a.fecha) || b.actualizado_at.localeCompare(a.actualizado_at) || b.id.localeCompare(a.id)
}

// Cada fila es una foto acumulada, no ventas adicionales del día. Primero
// elegimos la última por campaña; jamás sumamos el historial para un tablero.
export function tableroCampanas(registros: Metrica[]): CampanaMetricas[] {
  // ultimasMetricas conserva la primera fila ante un empate exacto de fechas;
  // ordenar antes resuelve ese caso por ID de manera independiente de la red.
  return ultimasMetricas([...registros].sort(porRecencia)).sort(porRecencia).map(m => ({
    clave: claveCampana(m),
    id: m.id,
    alumna_id: m.alumna_id,
    campana: m.campana.normalize('NFC').trim().replace(/\s+/g, ' '),
    estrategia: m.estrategia,
    fecha: m.fecha,
    actualizado_at: m.actualizado_at,
    mensajes_recibidos: m.mensajes_recibidos,
    personas_grupo: m.personas_grupo,
    reservas: m.reservas,
    ventas: m.ventas,
    gasto_acumulado: m.gasto_acumulado,
    comision_producto: m.comision_producto,
    calculadas: {
      ...calcularMetricas(m),
      costoVenta: m.gasto_acumulado !== null && m.ventas > 0 ? m.gasto_acumulado / m.ventas : null,
      conversionMensajesVentas: m.mensajes_recibidos > 0 ? m.ventas / m.mensajes_recibidos * 100 : null,
    },
  }))
}

function diferencia(a: number | null, b: number | null) {
  if (a === null || b === null || !Number.isFinite(a) || !Number.isFinite(b)) return null
  return a === b ? 0 : a - b
}

export function compararCampanas(a: CampanaMetricas, b: CampanaMetricas): ComparacionCampanas | null {
  // No cruzar resultados de diferentes alumnas ni comparar una campaña consigo
  // misma, aunque sus nombres lleguen con distinta capitalización o espacios.
  if (a.alumna_id !== b.alumna_id || a.clave === b.clave) return null
  return {
    a, b,
    diferencias: {
      ventas: a.ventas - b.ventas,
      gasto: diferencia(a.gasto_acumulado, b.gasto_acumulado),
      comisiones: diferencia(a.calculadas.comisiones, b.calculadas.comisiones),
      neto: diferencia(a.calculadas.neto, b.calculadas.neto),
      costoVenta: diferencia(a.calculadas.costoVenta, b.calculadas.costoVenta),
      conversionMensajesVentas: diferencia(a.calculadas.conversionMensajesVentas, b.calculadas.conversionMensajesVentas),
      cierre: diferencia(a.calculadas.cierre, b.calculadas.cierre),
    },
  }
}
