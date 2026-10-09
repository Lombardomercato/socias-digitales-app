import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, isAdminSupabaseConfigured } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Solicitud no permitida.' }, { status: 403 })
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Iniciá sesión.' }, { status: 401 })
  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).maybeSingle()
  if (perfil?.rol !== 'admin') return NextResponse.json({ error: 'Solo la administradora puede cambiar este acceso.' }, { status: 403 })
  if (!isAdminSupabaseConfigured()) return NextResponse.json({ error: 'Falta configurar el servidor.' }, { status: 503 })
  let body: { perfilId?: string; habilitada?: boolean }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 }) }
  if (typeof body.perfilId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.perfilId) || typeof body.habilitada !== 'boolean') {
    return NextResponse.json({ error: 'Elegí una alumna y un acceso válidos.' }, { status: 400 })
  }
  const admin = createAdminClient()
  const { data: alumna, error: consultaError } = await admin.from('perfiles').select('rol, desafio_socias_habilitada').eq('id', body.perfilId).maybeSingle()
  if (consultaError || !alumna) return NextResponse.json({ error: 'No encontramos esa cuenta.' }, { status: 404 })
  if (alumna.rol === 'admin' || (body.habilitada && !alumna.desafio_socias_habilitada)) {
    return NextResponse.json({ error: 'Primero habilitá el acceso de la alumna a las clases.' }, { status: 409 })
  }
  const { error } = await admin.from('accesos_estrategia').upsert({
    usuaria_id: body.perfilId, habilitada: body.habilitada,
    administradora_id: user.id, actualizada_en: new Date().toISOString(),
  })
  if (error) return NextResponse.json({ error: 'No se pudo actualizar Estrategia.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
