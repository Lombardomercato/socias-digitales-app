export interface ProgresoClase {
  clase_id: string
  posicion_seg: number
  duracion_seg: number
  completada: boolean
  actualizado_en: string
}

export type CambioProgreso =
  | { action: 'posicion'; posicion: number; duracion: number }
  | { action: 'completada'; completada: boolean }

export function validarProgreso(value: unknown): CambioProgreso | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const v = value as Record<string, unknown>
  if (v.action === 'completada' && typeof v.completada === 'boolean')
    return { action: v.action, completada: v.completada }
  if (v.action !== 'posicion' || typeof v.posicion !== 'number' || typeof v.duracion !== 'number') return null
  if (!Number.isFinite(v.posicion) || !Number.isFinite(v.duracion) || v.posicion < 0 || v.duracion < 1 || v.duracion > 172800 || v.posicion > v.duracion + 1) return null
  return { action: 'posicion', posicion: Math.min(Math.floor(v.posicion), Math.floor(v.duracion)), duracion: Math.floor(v.duracion) }
}

export function tiempoClase(segundos: number) {
  const total = Math.max(0, Math.floor(segundos))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export function resumenPrograma(ids: string[], progreso: ProgresoClase[]) {
  const validos = new Set(ids)
  const completas = new Set(progreso.filter(p => validos.has(p.clase_id) && p.completada).map(p => p.clase_id)).size
  return { completas, total: validos.size, porcentaje: validos.size ? Math.round(completas / validos.size * 100) : 0 }
}

// Solo clases publicadas, con video y con acceso actual. Nunca recomendar una bloqueada.
export function claseParaContinuar<T extends { id: string; puede_ver?: boolean; tiene_video_privado?: boolean; vimeo_url?: string | null }>(clases: T[], progreso: ProgresoClase[]) {
  const disponibles = clases.filter(c => c.puede_ver && (c.tiene_video_privado || c.vimeo_url))
  const recientes = [...progreso].filter(p => !p.completada && p.posicion_seg > 0).sort((a,b) => b.actualizado_en.localeCompare(a.actualizado_en))
  for (const p of recientes) {
    const clase = disponibles.find(c => c.id === p.clase_id)
    if (clase) return { clase, progreso: p }
  }
  return null
}
