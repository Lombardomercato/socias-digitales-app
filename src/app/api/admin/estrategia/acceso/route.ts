import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, isAdminSupabaseConfigured } from '@/lib/supabase/admin'
import { puedeVerClasesPrivadas } from '@/lib/class-access'

export async function POST(request: Request) {
  try { return await cambiarAcceso(request) }
  catch { return NextResponse.json({ error: 'No pudimos conectarnos. Comprobá el acceso antes de reintentar.' }, { status: 503 }) }
}

async function cambiarAcceso(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Solicitud no permitida.' }, { status: 403 })
  }
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Iniciá sesión.' }, { status: 401 })
  const { data: perfil, error: perfilError } = await supabase.from('perfiles').select('rol').eq('id', user.id).maybeSingle()
  if (perfilError) return NextResponse.json({ error: 'No pudimos comprobar tus permisos.' }, { status: 503 })
  if (perfil?.rol !== 'admin') return NextResponse.json({ error: 'Solo la administradora puede cambiar este acceso.' }, { status: 403 })
  if (!isAdminSupabaseConfigured()) return NextResponse.json({ error: 'Falta configurar el servidor.' }, { status: 503 })
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 }) }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Elegí una alumna y un acceso válidos.' }, { status: 400 })
  }
  const { perfilId, habilitada } = body as Record<string, unknown>
  if (typeof perfilId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(perfilId) || typeof habilitada !== 'boolean' || Object.keys(body).some(key => !['perfilId', 'habilitada'].includes(key))) {
    return NextResponse.json({ error: 'Elegí una alumna y un acceso válidos.' }, { status: 400 })
  }
  const admin = createAdminClient()
  const { data: alumna, error: consultaError } = await admin.from('perfiles').select('rol,tipo_usuario,estado,desafio_socias_habilitada').eq('id', perfilId).maybeSingle()
  if (consultaError) return NextResponse.json({ error: 'No pudimos comprobar la cuenta.' }, { status: 503 })
  if (!alumna) return NextResponse.json({ error: 'No encontramos esa cuenta.' }, { status: 404 })
  // La habilitación individual no reemplaza el requisito Desafío de las RLS existentes.
  if (alumna.rol === 'admin' || (habilitada && (!puedeVerClasesPrivadas(alumna) || alumna.desafio_socias_habilitada !== true))) {
    return NextResponse.json({ error: 'Por ahora, Estrategia requiere una alumna activa con el acceso al Desafío habilitado.' }, { status: 409 })
  }
  const { data: acceso, error } = await admin.from('accesos_estrategia').upsert({
    usuaria_id: perfilId, habilitada,
    administradora_id: user.id, actualizada_en: new Date().toISOString(),
  }, { onConflict: 'usuaria_id' }).select('usuaria_id,habilitada,administradora_id').maybeSingle()
  if (error || !acceso || acceso.usuaria_id !== perfilId || acceso.habilitada !== habilitada || acceso.administradora_id !== user.id) {
    return NextResponse.json({ error: 'No pudimos confirmar el acceso a Estrategia. Recargá la ficha antes de reintentar.' }, { status: 503 })
  }
  return NextResponse.json({ ok: true })
}
