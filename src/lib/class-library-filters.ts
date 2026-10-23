import { ubicacionClase } from './class-management'
import type { ProgresoClase } from './class-progress'

export type EstadoAvanceClase = 'pendiente' | 'en_curso' | 'completada'
export type FiltroAvanceClase = 'todas' | EstadoAvanceClase

export const FILTROS_AVANCE_CLASES: ReadonlyArray<{ id: FiltroAvanceClase; etiqueta: string }> = [
  { id: 'todas', etiqueta: 'Todas' },
  { id: 'pendiente', etiqueta: 'Pendientes' },
  { id: 'en_curso', etiqueta: 'En curso' },
  { id: 'completada', etiqueta: 'Completadas' },
]

interface ClaseBiblioteca {
  id: string
  titulo: string
  modulo: string
  activo?: boolean
  puede_ver?: boolean
  tiene_video_privado?: boolean
  vimeo_url?: string | null
}

interface FiltrosBiblioteca {
  programa?: string
  buscar?: string
  avance?: FiltroAvanceClase
  tieneAcceso?: boolean
  errorProgreso?: boolean
}

function textoBusqueda(texto: string) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('es')
}

export function coincideBusquedaClase(titulo: string, buscar: string) {
  return textoBusqueda(titulo).includes(textoBusqueda(buscar))
}

export function claseDisponibleBiblioteca(clase: ClaseBiblioteca, tieneAcceso = false) {
  return clase.activo !== false && (clase.puede_ver ?? tieneAcceso) && Boolean(clase.tiene_video_privado || clase.vimeo_url)
}

export function estadoAvanceClase(progreso?: ProgresoClase): EstadoAvanceClase {
  if (progreso?.completada) return 'completada'
  return progreso && Number.isFinite(progreso.posicion_seg) && progreso.posicion_seg > 0 ? 'en_curso' : 'pendiente'
}

// Solo selecciona contenido ya recibido. Nunca concede acceso ni altera la secuencia del reproductor.
export function filtrarBibliotecaClases<T extends ClaseBiblioteca>(clases: T[], progreso: ProgresoClase[], {
  programa = 'Todos', buscar = '', avance = 'todas', tieneAcceso = false, errorProgreso = false,
}: FiltrosBiblioteca = {}) {
  const porClase = new Map<string, ProgresoClase>()
  for (const item of progreso) {
    const anterior = porClase.get(item.clase_id)
    if (!anterior || item.actualizado_en > anterior.actualizado_en) porClase.set(item.clase_id, item)
  }
  const ids = new Set<string>()
  const base = clases.filter(clase => {
    if (clase.activo === false || ids.has(clase.id)) return false
    ids.add(clase.id)
    return (programa === 'Todos' || ubicacionClase(clase.modulo).programa === programa) && coincideBusquedaClase(clase.titulo, buscar)
  })
  const disponibles = base.filter(clase => claseDisponibleBiblioteca(clase, tieneAcceso))
  const conteos: Record<FiltroAvanceClase, number | null> = {
    todas: disponibles.length, pendiente: null, en_curso: null, completada: null,
  }
  if (!errorProgreso) {
    conteos.pendiente = 0
    conteos.en_curso = 0
    conteos.completada = 0
    for (const clase of disponibles) {
      const estado = estadoAvanceClase(porClase.get(clase.id))
      conteos[estado] = (conteos[estado] ?? 0) + 1
    }
  }
  const avanceAplicado = errorProgreso ? 'todas' : avance
  const visibles = avanceAplicado === 'todas' ? base : disponibles.filter(clase => estadoAvanceClase(porClase.get(clase.id)) === avanceAplicado)
  return {
    visibles,
    idsVisibles: visibles.map(clase => clase.id),
    conteos,
    disponibles: disponibles.length,
    bloqueadas: base.length - disponibles.length,
    filtrosActivos: programa !== 'Todos' || Boolean(textoBusqueda(buscar)) || avanceAplicado !== 'todas',
  }
}
