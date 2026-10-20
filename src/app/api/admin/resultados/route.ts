import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ESTADOS_RESULTADO, UUID_RESULTADO } from '@/lib/results'

export async function PATCH(req: NextRequest) {
  try { return await revisar(req) } catch { return NextResponse.json({error:'No pudimos conectarnos. Reintentá la revisión.'},{status:503}) }
}
async function revisar(req: NextRequest) {
  if (req.headers.get('origin')!==req.nextUrl.origin) return NextResponse.json({error:'Origen no permitido.'},{status:403})
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user) return NextResponse.json({error:'Iniciá sesión.'},{status:401})
  const {data:perfil}=await supabase.from('perfiles').select('rol').eq('id',user.id).maybeSingle()
  if(perfil?.rol!=='admin') return NextResponse.json({error:'Solo Flor puede revisar resultados.'},{status:403})
  let x
  try { x=await req.json() } catch { return NextResponse.json({error:'Datos no válidos.'},{status:400}) }
  if(!x || typeof x.id!=='string' || !UUID_RESULTADO.test(x.id) || !ESTADOS_RESULTADO.includes(x.estado) || !ESTADOS_RESULTADO.includes(x.anterior)) return NextResponse.json({error:'Estado no válido.'},{status:400})
  if(x.estado==='aprobado') {
    const {data:resultado,error:lectura}=await supabase.from('resultados').select('archivo_url').eq('id',x.id).maybeSingle()
    if(lectura) return NextResponse.json({error:'No pudimos comprobar el comprobante. Reintentá la revisión.'},{status:503})
    if(!resultado) return NextResponse.json({error:'El resultado ya no está disponible.'},{status:409})
    if(!resultado.archivo_url) return NextResponse.json({error:'No se puede aprobar sin comprobante. La alumna debe enviar una nueva carga con su captura.'},{status:400})
  }
  const {data,error}=await supabase.from('resultados').update({estado:x.estado}).eq('id',x.id).eq('estado',x.anterior).select('id').maybeSingle()
  if(error) return NextResponse.json({error:'No pudimos guardar la revisión. Intentá nuevamente.'},{status:503})
  if(!data) return NextResponse.json({error:'El resultado cambió o ya no está disponible. Actualizá antes de revisarlo.'},{status:409})
  return NextResponse.json({ok:true})
}
