import 'server-only'
import type { createClient } from './supabase/server'
export async function permisoMetricas(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const {data:perfil,error}=await supabase.from('perfiles').select('rol,tipo_usuario,estado').eq('id',userId).maybeSingle()
  if (error || !perfil) return {permitido:false,admin:false,error:true}
  if (perfil.rol==='admin') return {permitido:true,admin:true,error:false}
  if (perfil.estado!=='activa' || !(perfil.tipo_usuario==='socia' || ['afiliada','afiliada_lanzamiento'].includes(perfil.rol))) return {permitido:false,admin:false,error:false}
  const {data:acceso,error:fallo}=await supabase.from('accesos_metricas').select('habilitada').eq('usuaria_id',userId).maybeSingle()
  return {permitido:!fallo && acceso?.habilitada===true,admin:false,error:Boolean(fallo)}
}
