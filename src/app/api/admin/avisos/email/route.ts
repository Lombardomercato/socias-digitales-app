import { after, NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { emailAvisosConfigurado, procesarEmailsAviso } from '@/lib/notice-email'

export const maxDuration = 300
export async function POST(req: NextRequest) {
  if (req.headers.get('origin') !== req.nextUrl.origin) return NextResponse.json({error:'Origen no permitido.'},{status:403})
  const supabase = await createClient()
  const {data:{user}} = await supabase.auth.getUser()
  if(!user) return NextResponse.json({error:'Iniciá sesión.'},{status:401})
  const {data:perfil} = await supabase.from('perfiles').select('rol').eq('id',user.id).maybeSingle()
  if(perfil?.rol!=='admin') return NextResponse.json({error:'Sin permiso.'},{status:403})
  let input
  try { input=await req.json() } catch { return NextResponse.json({error:'Aviso no válido.'},{status:400}) }
  if(typeof input?.avisoId!=='string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.avisoId)) return NextResponse.json({error:'Aviso no válido.'},{status:400})
  const {data:aviso} = await supabase.from('avisos').select('publicado,archivado,email_solicitado').eq('id',input.avisoId).maybeSingle()
  if(!aviso?.publicado || aviso.archivado || !aviso.email_solicitado) return NextResponse.json({error:'El aviso no tiene un envío de email activo.'},{status:400})
  if(!emailAvisosConfigurado()) return NextResponse.json({error:'El envío de emails no está configurado.'},{status:503})
  after(()=>procesarEmailsAviso(input.avisoId))
  return NextResponse.json({ok:true,mensaje:'Se están procesando hasta 20 emails pendientes. Actualizá el historial para ver los resultados.'})
}
