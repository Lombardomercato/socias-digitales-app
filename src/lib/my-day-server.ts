import 'server-only'
import type { createClient } from './supabase/server'
import { semanaDia, type ResumenDia, type TareaDia } from './my-day'
export async function permisoMiDia(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: perfil, error } = await supabase.from('perfiles').select('rol,tipo_usuario,estado').eq('id', userId).maybeSingle()
  if (error || !perfil) return { permitido: false, admin: false, error: true }
  if (perfil.rol === 'admin') return { permitido: true, admin: true, error: false }
  if (perfil.estado !== 'activa' || !(perfil.tipo_usuario === 'socia' || ['afiliada', 'afiliada_lanzamiento'].includes(perfil.rol))) return { permitido: false, admin: false, error: false }
  const { data: acceso, error: fallo } = await supabase.from('accesos_mi_dia').select('habilitada').eq('usuaria_id', userId).maybeSingle()
  return { permitido: !fallo && acceso?.habilitada === true, admin: false, error: Boolean(fallo) }
}
export async function leerMiDia(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, fecha: string) {
  const dias = semanaDia(fecha)
  const [lista, resumen] = await Promise.all([
    supabase.from('checklist_tareas').select('*', { count: 'exact' }).eq('alumna_id', userId).eq('fecha', fecha).order('creado_en').order('id').limit(500),
    supabase.rpc('resumen_mi_dia', { desde: dias[0], hasta: dias[6] }),
  ])
  return { tareas: (lista.data ?? []) as TareaDia[], semana: ((resumen.data ?? []) as ResumenDia[]).filter(r => r.alumna_id === userId), limitado: (lista.count ?? 0) > 500, errorCarga: Boolean(lista.error || resumen.error) }
}
