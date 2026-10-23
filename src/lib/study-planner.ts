import type { ClaseCampus, ResumenCampus } from './learning-campus'
import { mismaTarea, validarTarea, type DatosTarea, type TareaDia } from './my-day'

export type OpcionEstudio = ClaseCampus
export interface PlanEstudio {
  estado: 'listo' | 'error'
  opciones: OpcionEstudio[]
}

export function planEstudioDesdeCampus(resumen: ResumenCampus): PlanEstudio {
  if (resumen.estado !== 'listo' || resumen.completadas === null || resumen.enCurso === null) return { estado: 'error', opciones: [] }
  const opciones: OpcionEstudio[] = []
  const ids = new Set<string>()
  for (const programa of resumen.programas) {
    if (programa.completadas === null || programa.enCurso === null || programa.completo === null) return { estado: 'error', opciones: [] }
    const proxima = programa.proxima
    if (!proxima || programa.completo || programa.total < 1 || ids.has(proxima.id)) continue
    if (!proxima.id || !proxima.titulo.trim() || !proxima.programa.trim() || !['Clases', 'Material de apoyo'].includes(proxima.seccion) || !['continuar', 'empezar'].includes(proxima.motivo) || (proxima.posicionSeg !== null && (!Number.isFinite(proxima.posicionSeg) || proxima.posicionSeg < 0))) return { estado: 'error', opciones: [] }
    ids.add(proxima.id)
    // Proyección explícita: no copiar URLs de reproducción, perfil u otros
    // campos que pudiera incorporar una fuente en el futuro.
    opciones.push({
      id: proxima.id, titulo: proxima.titulo, programa: proxima.programa,
      seccion: proxima.seccion, motivo: proxima.motivo, posicionSeg: proxima.posicionSeg,
    })
  }
  return { estado: 'listo', opciones }
}

function abreviar(texto: string, maximo: number) {
  if (texto.length <= maximo) return texto
  let corte = texto.slice(0, maximo - 1).trimEnd()
  if (/[\uD800-\uDBFF]$/.test(corte)) corte = corte.slice(0, -1)
  return `${corte}…`
}

export function textoTareaEstudio(opcion: OpcionEstudio) {
  const normalizar = (texto: string) => texto.normalize('NFC').trim().replace(/\s+/g, ' ')
  const programa = abreviar(normalizar(opcion.programa), 75)
  const prefijo = 'Estudiar: «'
  const separador = '» · '
  const titulo = abreviar(normalizar(opcion.titulo), 300 - prefijo.length - separador.length - programa.length)
  // Es una nota humana editable. No codifica la clase ni crea una relación
  // persistida: completar esta tarea no marca el video como completado.
  return `${prefijo}${titulo}${separador}${programa}`
}

function fechaISOValida(valor: unknown): valor is string {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(valor) || !Number.isFinite(Date.parse(valor))) return false
  const dia = valor.slice(0, 10)
  const hora = Number(valor.slice(11, 13)), minuto = Number(valor.slice(14, 16)), segundo = Number(valor.slice(17, 19))
  return hora < 24 && minuto < 60 && segundo < 60 && new Date(`${dia}T12:00:00Z`).toISOString().slice(0, 10) === dia
}

export function confirmarTareaEstudioCreada(respuesta: unknown, { id, alumnaId, datos }: { id: string; alumnaId: string; datos: DatosTarea }): TareaDia | null {
  try {
    const intencion = validarTarea({ ...datos, id, version: null }, 'crear')
    if (!alumnaId || !respuesta || typeof respuesta !== 'object' || Array.isArray(respuesta)) return null
    const resultado = respuesta as Record<string, unknown>
    if (resultado.ok !== true || !resultado.tarea || typeof resultado.tarea !== 'object' || Array.isArray(resultado.tarea)) return null
    const fila = resultado.tarea as Record<string, unknown>
    if (fila.id !== intencion.id || fila.alumna_id !== alumnaId || typeof fila.version !== 'number' || !Number.isSafeInteger(fila.version) || fila.version < 1 || !fechaISOValida(fila.creado_en) || !fechaISOValida(fila.actualizada_en)) return null
    if (!mismaTarea(fila as unknown as DatosTarea, intencion.datos)) return null
    return { ...intencion.datos, id: intencion.id, alumna_id: alumnaId, version: fila.version, creado_en: fila.creado_en, actualizada_en: fila.actualizada_en }
  } catch { return null }
}
