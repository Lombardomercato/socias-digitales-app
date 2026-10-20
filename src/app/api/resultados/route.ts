import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, isAdminSupabaseConfigured } from '@/lib/supabase/admin'
import { permisoResultados } from '@/lib/results-server'
import { validarResultado, MAX_CAPTURA, formatoCaptura } from '@/lib/results'

export async function POST(req: NextRequest) {
  try { return await guardar(req) } catch { return NextResponse.json({error:'No pudimos conectarnos. Tus datos siguen en el formulario; podés reintentar.'},{status:503}) }
}
async function guardar(req: NextRequest) {
  if (req.headers.get('origin') !== req.nextUrl.origin) return NextResponse.json({error:'Origen no permitido.'},{status:403})
  const supabase = await createClient()
  const { data:{user} } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({error:'Iniciá sesión.'},{status:401})
  const acceso = await permisoResultados(supabase,user.id)
  if (acceso.error) return NextResponse.json({error:'No pudimos comprobar tu acceso.'},{status:503})
  if (!acceso.permitido) return NextResponse.json({error:'Flor todavía no habilitó Resultados para tu cuenta.'},{status:403})
  if (!isAdminSupabaseConfigured()) return NextResponse.json({error:'El servicio no está disponible.'},{status:503})
  if (Number(req.headers.get('content-length') ?? 0) > MAX_CAPTURA + 30000) return NextResponse.json({error:'La captura debe pesar hasta 3 MB.'},{status:413})
  let datos: ReturnType<typeof validarResultado>
  let bytes: Uint8Array | null = null
  let archivo: string | null = null
  let mime = ''
  try {
    const form = await req.formData()
    if (typeof form.get('datos') !== 'string') throw new Error('Revisá el formulario.')
    datos = validarResultado(JSON.parse(form.get('datos') as string))
    if (datos.monto === null || datos.monto <= 0) throw new Error('Ingresá la comisión en USD que figura en tu comprobante.')
    const captura = form.get('captura')
    if (captura === null) throw new Error('Adjuntá el comprobante para que Flor pueda revisar tu resultado.')
    if (captura !== null) {
      if (typeof captura === 'string' || captura.size === 0 || captura.size > MAX_CAPTURA) throw new Error('La captura debe pesar hasta 3 MB.')
      bytes = new Uint8Array(await captura.arrayBuffer()); mime = captura.type
      const extension = formatoCaptura(bytes,mime)
      archivo = `${user.id}/${datos.id}/${createHash('sha256').update(bytes).digest('hex')}.${extension}`
    }
  } catch (causa) { return NextResponse.json({error:causa instanceof Error ? causa.message : 'Revisá el formulario.'},{status:400}) }
  const admin = createAdminClient()
  if (datos.producto_id) {
    const {data:producto,error} = await admin.from('productos').select('id').eq('id',datos.producto_id).eq('activo',true).maybeSingle()
    if (error) return NextResponse.json({error:'No pudimos comprobar el producto.'},{status:503})
    if (!producto) return NextResponse.json({error:'Ese producto ya no está disponible.'},{status:400})
  }
  const coinciden = (r: {alumna_id:string;descripcion:string|null;monto:number|null;mes:string|null;producto_id:string|null;archivo_url:string|null}) =>
    r.alumna_id===user.id && r.descripcion===datos.descripcion && Number(r.monto ?? -1)===Number(datos.monto ?? -1) && r.mes===datos.mes && r.producto_id===datos.producto_id && r.archivo_url===archivo
  const {data:existente,error:consultaError} = await admin.from('resultados').select('alumna_id,descripcion,monto,mes,producto_id,archivo_url').eq('id',datos.id).maybeSingle()
  if (consultaError) return NextResponse.json({error:'No pudimos comprobar el envío. Intentá nuevamente.'},{status:503})
  if (existente) return coinciden(existente) ? NextResponse.json({ok:true,id:datos.id}) : NextResponse.json({error:'Este envío ya fue registrado con otros datos.'},{status:409})
  let subido = false
  if (bytes && archivo) {
    const {error} = await admin.storage.from('resultados').upload(archivo,bytes,{contentType:mime,upsert:false,cacheControl:'0'})
    if (error && String(error.statusCode) !== '409') return NextResponse.json({error:'No pudimos subir la captura. Tus datos siguen en el formulario.'},{status:503})
    subido = !error
  }
  // La identidad y el estado nunca vienen del navegador; RLS se vuelve a aplicar.
  const {data:creado,error} = await supabase.from('resultados').insert({...datos,alumna_id:user.id,archivo_url:archivo,tipo:archivo?'captura':'testimonio',estado:'pendiente'}).select('id').single()
  if (!error && creado) return NextResponse.json({ok:true,id:creado.id})
  const {data:reintento,error:errorReintento} = await admin.from('resultados').select('alumna_id,descripcion,monto,mes,producto_id,archivo_url').eq('id',datos.id).maybeSingle()
  if (!errorReintento && reintento && coinciden(reintento)) return NextResponse.json({ok:true,id:datos.id})
  if (subido && archivo && !errorReintento && !reintento) await admin.storage.from('resultados').remove([archivo])
  return NextResponse.json({error:'No pudimos guardar el resultado. Tus datos siguen en el formulario; podés reintentar.'},{status:503})
}
