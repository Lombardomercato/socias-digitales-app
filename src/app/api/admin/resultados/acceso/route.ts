import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { UUID_RESULTADO } from '@/lib/results'

export async function POST(req: NextRequest) {
  try { return await cambiar(req) } catch { return NextResponse.json({error:'No pudimos conectarnos. Comprobá el acceso antes de reintentar.'},{status:503}) }
}
async function cambiar(req: NextRequest) {
  if(req.headers.get('origin')!==req.nextUrl.origin) return NextResponse.json({error:'Origen no permitido.'},{status:403})
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user) return NextResponse.json({error:'Iniciá sesión.'},{status:401})
  const {data:perfil}=await supabase.from('perfiles').select('rol').eq('id',user.id).maybeSingle()
  if(perfil?.rol!=='admin') return NextResponse.json({error:'Sin permiso.'},{status:403})
  let x
  try{x=await req.json()}catch{return NextResponse.json({error:'Datos no válidos.'},{status:400})}
  if(!x || typeof x.usuaria_id!=='string' || !UUID_RESULTADO.test(x.usuaria_id) || typeof x.habilitada!=='boolean') return NextResponse.json({error:'Acceso no válido.'},{status:400})
  const {data:destino,error:consulta}=await supabase.from('perfiles').select('rol,tipo_usuario,estado').eq('id',x.usuaria_id).maybeSingle()
  if(consulta) return NextResponse.json({error:'No pudimos comprobar la cuenta.'},{status:503})
  if(!destino || destino.rol==='admin' || (x.habilitada && (destino.estado!=='activa' || !(destino.tipo_usuario==='socia' || ['afiliada','afiliada_lanzamiento'].includes(destino.rol))))) return NextResponse.json({error:'Primero asigná el plan Socias a una cuenta activa en Acceso y actividad.'},{status:400})
  const {error}=await supabase.from('accesos_resultados').upsert({usuaria_id:x.usuaria_id,habilitada:x.habilitada,administradora_id:user.id,actualizada_en:new Date().toISOString()},{onConflict:'usuaria_id'})
  if(error) return NextResponse.json({error:'No pudimos cambiar el acceso.'},{status:503})
  return NextResponse.json({ok:true})
}
