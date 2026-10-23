import type { ClaseCatalogo } from './class-access'
import { PROGRAMAS_INICIALES, SECCIONES_CLASE, ordenarClases, puedePublicarClase, ubicacionClase, type SeccionClase } from './class-management'
import { claseParaContinuar, resumenPrograma, type ProgresoClase } from './class-progress'

export interface ClaseCampus {
  id: string
  titulo: string
  programa: string
  seccion: SeccionClase
  motivo: 'continuar' | 'empezar'
  posicionSeg: number | null
}

export interface ProgramaCampus {
  nombre: string
  /** Solo clases publicadas, autorizadas y reproducibles. */
  total: number
  completadas: number | null
  enCurso: number | null
  bloqueadas: number
  /** Publicadas y autorizadas, pero todavía sin un video reproducible. */
  sinVideo: number
  completo: boolean | null
  proxima: ClaseCampus | null
}

export interface ResumenCampus {
  estado: 'listo' | 'error'
  programas: ProgramaCampus[]
  /** No incluye bloqueadas ni clases sin video; null si el catálogo falló. */
  total: number | null
  completadas: number | null
  enCurso: number | null
  bloqueadas: number | null
  sinVideo: number | null
  programasCompletos: number | null
  proxima: ClaseCampus | null
}

function campusDesconocido(): ResumenCampus {
  return { estado: 'error', programas: [], total: null, completadas: null, enCurso: null, bloqueadas: null, sinVideo: null, programasCompletos: null, proxima: null }
}

function disponible(clase: ClaseCatalogo) {
  return clase.puede_ver === true && puedePublicarClase({ tieneVideo: clase.tiene_video_privado === true, vimeo_url: clase.vimeo_url })
}

function sugerencia(clases: ClaseCatalogo[], progreso: ProgresoClase[]): ClaseCampus | null {
  const reciente = claseParaContinuar(clases, progreso)
  const completadas = new Set(progreso.filter(p => p.completada).map(p => p.clase_id))
  const clase = reciente?.clase ?? clases.find(c => !completadas.has(c.id))
  if (!clase) return null
  return {
    id: clase.id, titulo: clase.titulo, ...ubicacionClase(clase.modulo),
    motivo: reciente ? 'continuar' : 'empezar',
    posicionSeg: reciente ? Math.floor(reciente.progreso.posicion_seg) : null,
  }
}

// No acumula eventos, puntos ni certificados. Un programa conserva también sus
// videos de apoyo y su contenido bloqueado, para no declarar completo un recorte.
export function resumirCampusAprendizaje(clases: ClaseCatalogo[] | null, progreso: ProgresoClase[] | null): ResumenCampus {
  if (!Array.isArray(clases)) return campusDesconocido()
  const publicadas = new Map<string, ClaseCatalogo>()
  for (const clase of clases) {
    if (!clase || typeof clase.id !== 'string' || !clase.id || typeof clase.titulo !== 'string' || typeof clase.modulo !== 'string' || !Number.isFinite(clase.orden)) return campusDesconocido()
    if (clase.activo === true && !publicadas.has(clase.id)) publicadas.set(clase.id, clase)
  }
  const grupos = new Map<string, ClaseCatalogo[]>()
  for (const clase of publicadas.values()) {
    const { programa } = ubicacionClase(clase.modulo)
    grupos.set(programa, [...(grupos.get(programa) ?? []), clase])
  }
  const prioridad = (nombre: string) => {
    const indice = PROGRAMAS_INICIALES.findIndex(p => p === nombre)
    return indice < 0 ? PROGRAMAS_INICIALES.length : indice
  }
  const ordenados = [...grupos].sort(([a], [b]) => prioridad(a) - prioridad(b)).map(([nombre, grupo]) => ({
    nombre, clases: SECCIONES_CLASE.flatMap(seccion => ordenarClases(grupo.filter(c => ubicacionClase(c.modulo).seccion === seccion))),
  }))
  const disponibles = ordenados.flatMap(p => p.clases.filter(disponible))
  const idsDisponibles = new Set(disponibles.map(c => c.id))
  const porClase = new Map<string, ProgresoClase>()
  let conocido = Array.isArray(progreso)
  for (const item of Array.isArray(progreso) ? progreso : []) {
    if (!item || !idsDisponibles.has(item.clase_id)) continue
    if (typeof item.completada !== 'boolean' || !Number.isFinite(item.posicion_seg) || item.posicion_seg < 0 || typeof item.actualizado_en !== 'string' || !Number.isFinite(Date.parse(item.actualizado_en))) { conocido = false; break }
    const anterior = porClase.get(item.clase_id)
    if (!anterior || Date.parse(item.actualizado_en) > Date.parse(anterior.actualizado_en)) porClase.set(item.clase_id, { ...item, actualizado_en: new Date(item.actualizado_en).toISOString() })
  }
  const registros = [...porClase.values()]
  const programas: ProgramaCampus[] = ordenados.map(({ nombre, clases: grupo }) => {
    const permitidas = grupo.filter(disponible)
    const resumen = resumenPrograma(permitidas.map(c => c.id), registros)
    const bloqueadas = grupo.filter(c => c.puede_ver !== true).length
    const sinVideo = grupo.filter(c => c.puede_ver === true && !disponible(c)).length
    return {
      nombre, total: permitidas.length, bloqueadas, sinVideo,
      completadas: conocido ? resumen.completas : null,
      enCurso: conocido ? permitidas.filter(c => { const p = porClase.get(c.id); return p && !p.completada && p.posicion_seg > 0 }).length : null,
      completo: conocido ? permitidas.length > 0 && bloqueadas === 0 && sinVideo === 0 && resumen.completas === permitidas.length : null,
      proxima: conocido ? sugerencia(permitidas, registros) : null,
    }
  })
  return {
    estado: conocido ? 'listo' : 'error', programas, total: disponibles.length,
    completadas: conocido ? programas.reduce((s, p) => s + (p.completadas ?? 0), 0) : null,
    enCurso: conocido ? programas.reduce((s, p) => s + (p.enCurso ?? 0), 0) : null,
    bloqueadas: programas.reduce((s, p) => s + p.bloqueadas, 0),
    sinVideo: programas.reduce((s, p) => s + p.sinVideo, 0),
    programasCompletos: conocido ? programas.filter(p => p.completo).length : null,
    proxima: conocido ? sugerencia(disponibles, registros) : null,
  }
}
