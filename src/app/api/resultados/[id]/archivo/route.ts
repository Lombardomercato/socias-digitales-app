import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { permisoResultados } from '@/lib/results-server'
import { claveCaptura, capturaPertenece, UUID_RESULTADO } from '@/lib/results'

export async function GET(_req: NextRequest, ctx: { params: Promise<{id:string}> }) {
  try { return await abrir(ctx) } catch { return NextResponse.json({error:'No pudimos abrir la captura.'},{status:503,headers:{'Cache-Control':'private, no-store'}}) }
}
async function abrir(ctx: { params: Promise<{id:string}> }) {
  const headers = {'Cache-Control':'private, no-store'}
  const {id} = await ctx.params
  if (!UUID_RESULTADO.test(id)) return NextResponse.json({error:'Archivo no válido.'},{status:404,headers})
  const supabase = await createClient()
  const {data:{user}} = await supabase.auth.getUser()
  if (!user) return NextResponse.json({error:'Iniciá sesión.'},{status:401,headers})
  const acceso = await permisoResultados(supabase,user.id)
  if (!acceso.permitido) return NextResponse.json({error:'Sin acceso.'},{status:acceso.error?503:403,headers})
  const {data:resultado,error} = await supabase.from('resultados').select('alumna_id,archivo_url').eq('id',id).maybeSingle()
  if (error) return NextResponse.json({error:'No pudimos consultar el archivo.'},{status:503,headers})
  if (!resultado || (!acceso.admin && resultado.alumna_id!==user.id) || !resultado.archivo_url) return NextResponse.json({error:'Archivo no disponible.'},{status:404,headers})
  const clave = claveCaptura(resultado.archivo_url,process.env.NEXT_PUBLIC_SUPABASE_URL!)
  if (!clave || !capturaPertenece(clave,resultado.alumna_id,id)) return NextResponse.json({error:'Formato de archivo no disponible.'},{status:404,headers})
  const {data,error:errorFirma} = await createAdminClient().storage.from('resultados').createSignedUrl(clave,180)
  if (errorFirma || !data?.signedUrl) return NextResponse.json({error:'No pudimos abrir la captura.'},{status:503,headers})
  return NextResponse.redirect(data.signedUrl,{status:307,headers})
}
