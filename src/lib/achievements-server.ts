import 'server-only'
import type { createClient } from './supabase/server'
import { leerCatalogoClases } from './class-catalog'
import { leerProgresoClases } from './class-progress-server'
import { permisoMetricas } from './metrics-server'
import { permisoMiDia } from './my-day-server'
import { moverDia } from './my-day'
import { enteroLogros, puedeVerLogros, resumenClasesLogros, resumenDiasLogros, type DatosLogros, type PerfilLogros } from './achievements'

type Cliente = Awaited<ReturnType<typeof createClient>>
export async function leerLogros(supabase: Cliente, usuaria: string, perfil: PerfilLogros, fecha: string): Promise<DatosLogros> {
  if (!puedeVerLogros(perfil)) throw new Error('Sin acceso a Mis logros.')
  const desde = moverDia(fecha, -29)
  const clases = async (): Promise<DatosLogros['clases']> => {
    try {
      const [catalogo, progreso] = await Promise.all([leerCatalogoClases(perfil), leerProgresoClases(supabase, usuaria)])
      return { estado: 'lista', datos: resumenClasesLogros(catalogo, progreso) }
    } catch { console.error('achievements_classes_read_failed'); return { estado: 'error' } }
  }
  const metricas = async (): Promise<DatosLogros['metricas']> => {
    try {
      const permiso = await permisoMetricas(supabase, usuaria)
      if (permiso.error) return { estado: 'error' }
      if (!permiso.permitido) return { estado: 'bloqueada' }
      const { count, error } = await supabase.from('metricas').select('id', { count: 'exact', head: true }).eq('alumna_id', usuaria)
      if (error) throw new Error('read failed')
      return { estado: 'lista', datos: { analisis: enteroLogros(count) } }
    } catch { console.error('achievements_metrics_read_failed'); return { estado: 'error' } }
  }
  const dia = async (): Promise<DatosLogros['dia']> => {
    try {
      const permiso = await permisoMiDia(supabase, usuaria)
      if (permiso.error) return { estado: 'error' }
      if (!permiso.permitido) return { estado: 'bloqueada' }
      const { data, error } = await supabase.rpc('resumen_mi_dia', { desde, hasta: fecha })
      if (error || !Array.isArray(data)) throw new Error('read failed')
      return { estado: 'lista', datos: resumenDiasLogros(data, usuaria, fecha) }
    } catch { console.error('achievements_day_read_failed'); return { estado: 'error' } }
  }
  const [c, m, d] = await Promise.all([clases(), metricas(), dia()])
  return { fecha, desde, clases: c, metricas: m, dia: d }
}
