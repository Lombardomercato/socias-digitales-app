import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { permisoMetricas } from '@/lib/metrics-server'
import { validarMetrica, mismosDatos, normalizarMetrica, origenMetricasPermitido, type Metrica } from '@/lib/metrics'

const headers={'Cache-Control':'private, no-store'}
const responder=(body:object,status=200)=>NextResponse.json(body,{status,headers})
export async function POST(req: NextRequest) { return procesar(req,'crear') }
export async function PATCH(req: NextRequest) { return procesar(req,'editar') }
async function procesar(req: NextRequest, modo:'crear'|'editar') {
  try {
    if (!origenMetricasPermitido(req.headers.get('origin'),req.nextUrl.origin,req.headers.get('host'))) return responder({error:'Origen no permitido.'},403)
    if (Number(req.headers.get('content-length') ?? 0)>20000) return responder({error:'El análisis es demasiado grande.'},413)
    const supabase=await createClient()
    const {data:{user}}=await supabase.auth.getUser()
    if (!user) return responder({error:'Iniciá sesión.'},401)
    const acceso=await permisoMetricas(supabase,user.id)
    if (acceso.error) return responder({error:'No pudimos comprobar tu acceso.'},503)
    if (!acceso.permitido) return responder({error:'Flor todavía no habilitó Métricas para tu cuenta.'},403)
    let entrada: ReturnType<typeof validarMetrica>
    try { entrada=validarMetrica(await req.json(),modo) } catch(causa) { return responder({error:causa instanceof Error ? causa.message : 'Revisá los datos del análisis.'},400) }
    const {id,version,datos}=entrada
    const leer=()=>supabase.from('metricas').select('*').eq('id',id).eq('alumna_id',user.id).maybeSingle()
    const {data:existente,error:falloConsulta}=await leer()
    if (falloConsulta) return responder({error:'No pudimos comprobar el análisis. Tus datos siguen en el formulario.'},503)
    if (modo==='crear' && existente) return mismosDatos(existente as Metrica,datos) ? responder({ok:true,metrica:normalizarMetrica(existente)}) : responder({error:'Este envío ya fue guardado con otros datos.'},409)
    if (modo==='editar') {
      if (!existente) return responder({error:'Análisis no disponible.'},404)
      if (existente.version===Number(version)+1 && mismosDatos(existente,datos)) return responder({ok:true,metrica:normalizarMetrica(existente)})
      if (existente.version!==version) return responder({error:'El análisis cambió en otra pestaña. Abrilo nuevamente desde el historial antes de editarlo.'},409)
    }
    const query=modo==='crear' ? supabase.from('metricas').insert({...datos,id,alumna_id:user.id}) :
      supabase.from('metricas').update(datos).eq('id',id).eq('alumna_id',user.id).eq('version',version!)
    const {data:guardada,error}=await query.select('*').maybeSingle()
    if (!error && guardada) return responder({ok:true,metrica:normalizarMetrica(guardada)})
    // Si se perdió la respuesta, el mismo intento no vuelve a crear un análisis.
    const {data:confirmada,error:falloConfirmacion}=await leer()
    if (!falloConfirmacion && confirmada && mismosDatos(confirmada,datos) && (modo==='crear' || confirmada.version===Number(version)+1)) return responder({ok:true,metrica:normalizarMetrica(confirmada)})
    if (error?.code==='23505') return responder({error:'Ya hay un análisis de esta campaña y estrategia para esa fecha. Abrilo desde el historial para editarlo.'},409)
    if (!error && modo==='editar') return responder({error:'El análisis cambió. Abrilo nuevamente desde el historial.'},409)
    return responder({error:'No pudimos guardar el análisis. Tus datos siguen en el formulario; podés reintentar.'},503)
  } catch { return responder({error:'No pudimos conectarnos. Tus datos siguen en el formulario; podés reintentar.'},503) }
}
