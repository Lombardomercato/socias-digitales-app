import { createAdminClient, isAdminSupabaseConfigured } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ROLES_PERMITIDOS = new Set(['alumna', 'afiliada', 'afiliada_lanzamiento', 'admin'])

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .maybeSingle()

  if (perfil?.rol !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  let body: { userId?: string; rol?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
  }

  const { userId, rol } = body
  if (!userId || !rol || !ROLES_PERMITIDOS.has(rol)) {
    return NextResponse.json({ error: 'Usuario o rol inválido' }, { status: 400 })
  }

  if (!isAdminSupabaseConfigured()) {
    return NextResponse.json({ error: 'La administración de usuarios todavía no está configurada' }, { status: 503 })
  }

  const admin = createAdminClient()
  const { data: perfilActualizado, error } = await admin
    .from('perfiles')
    .update({ rol })
    .eq('id', userId)
    .select('id, rol')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!perfilActualizado) {
    return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, perfil: perfilActualizado })
}
