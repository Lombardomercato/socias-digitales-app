import 'server-only'
import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ProgresoClase } from './class-progress'

export function progresoPublico(p: ProgresoClase): ProgresoClase {
  return { clase_id: p.clase_id, posicion_seg: p.posicion_seg, duracion_seg: p.duracion_seg, completada: p.completada, actualizado_en: p.actualizado_en }
}

export async function leerProgresoClases(supabase: SupabaseClient, alumnaId: string) {
  const { data, error } = await supabase.from('progreso_clases')
    .select('clase_id,posicion_seg,duracion_seg,completada,actualizado_en,video_revision,clases!inner(video_key,vimeo_url,activo)')
    .eq('alumna_id', alumnaId)
  if (error) throw new Error('No pudimos cargar tu progreso. Podés seguir viendo las clases.')
  return (data ?? []).flatMap(p => {
    const clase = (Array.isArray(p.clases) ? p.clases[0] : p.clases) as {video_key: string|null;vimeo_url:string|null;activo:boolean}
    if (!clase?.activo || createHash('md5').update(clase.video_key ?? clase.vimeo_url ?? '').digest('hex') !== p.video_revision) return []
    return [progresoPublico(p)]
  })
}
