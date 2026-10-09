import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, isAdminSupabaseConfigured } from '@/lib/supabase/admin'
import { PASOS_PERFIL, pasosVisibles, normalizarRespuesta, type CampoPerfil, type RespuestasPerfil } from '@/lib/perfil-preguntas'

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'Solicitud no permitida.' }, { status: 403 })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ingresá a tu cuenta para continuar.' }, { status: 401 })
  if (!isAdminSupabaseConfigured()) return NextResponse.json({ error: 'El guardado no está disponible.' }, { status: 503 })
  let body: { campo?: string; valor?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Revisá tu respuesta.' }, { status: 400 }) }
  const indice = PASOS_PERFIL.findIndex(paso => paso.campo === body.campo)
  if (indice < 0) return NextResponse.json({ error: 'Pregunta no válida.' }, { status: 400 })
  const campo = body.campo as CampoPerfil
  const [{ data: perfil, error: perfilError }, { data: estado, error: estadoError }] = await Promise.all([
    supabase.from('perfiles').select('nombre,whatsapp,telefono,fecha_nacimiento,ocupacion,titulo_profesional,es_mama,ingresos_actuales,pais,provincia,avatar_url,rol').eq('id',user.id).maybeSingle(),
    supabase.from('bienvenida_perfiles').select('paso,respondidas,exenta,completado_at').eq('usuaria_id',user.id).maybeSingle(),
  ])
  if (perfilError || estadoError || !perfil) return NextResponse.json({ error: 'No pudimos leer tu perfil. Intentá nuevamente.' }, { status: 503 })
  if (perfil.rol === 'admin' || estado?.completado_at) return NextResponse.json({ error: 'Tu perfil se edita desde Mi perfil.' }, { status: 409 })
  if (indice > (estado?.paso ?? 0)) return NextResponse.json({ error: 'Completá las preguntas anteriores primero.' }, { status: 409 })
  let valor
  try { valor = normalizarRespuesta(campo, body.valor, { userId:user.id, supabaseUrl:process.env.NEXT_PUBLIC_SUPABASE_URL!, anterior:perfil[campo] }) }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Revisá tu respuesta.' }, { status: 400 }) }
  const respuestas = { ...perfil, [campo]: valor } as RespuestasPerfil
  const respondidas = [...new Set<string>([...(estado?.respondidas ?? []),campo])]
  const visibles = pasosVisibles(respuestas)
  const final = campo === 'avatar_url'
  if (final && !visibles.every(paso => respondidas.includes(paso.campo))) return NextResponse.json({ error: 'Faltan preguntas por completar.' }, { status: 409 })
  if (final) {
    try { for (const clave of ['nombre','ocupacion','pais'] as CampoPerfil[]) normalizarRespuesta(clave,respuestas[clave],{userId:user.id,supabaseUrl:process.env.NEXT_PUBLIC_SUPABASE_URL!,anterior:perfil[clave]}) }
    catch { return NextResponse.json({error:'Revisá tu nombre, ocupación y país antes de terminar.'},{status:400}) }
  }
  const siguiente = final ? PASOS_PERFIL.length : PASOS_PERFIL.findIndex(paso => paso.campo === visibles.find(paso => PASOS_PERFIL.findIndex(original => original.campo === paso.campo) > indice)?.campo)
  const { data: guardado, error } = await supabase.from('perfiles').update({ [campo]: valor }).eq('id',user.id).select('id').maybeSingle()
  if (error || !guardado) return NextResponse.json({ error: 'No pudimos guardar tu respuesta. Intentá nuevamente.' }, { status: 500 })
  const { error: progresoError } = await createAdminClient().from('bienvenida_perfiles').upsert({
    usuaria_id:user.id, paso:siguiente, respondidas, exenta:estado?.exenta ?? false,
    completado_at: final ? new Date().toISOString() : null, actualizado_at:new Date().toISOString(),
  })
  if (progresoError) return NextResponse.json({ error: 'Tu respuesta se guardó, pero no pudimos avanzar. Intentá nuevamente.' }, { status: 500 })
  return NextResponse.json({ ok:true, paso:siguiente, completado:final })
}
