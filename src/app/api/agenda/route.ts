import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { leerAgenda } from '@/lib/agenda-store'
import { hitoParaAlumna } from '@/lib/agenda-management'

export async function GET() {
  const headers = { 'Cache-Control': 'private, no-store' }
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Iniciá sesión.' }, { status: 401, headers })
    const { data: perfil, error: fallo } = await supabase.from('perfiles').select('rol,tipo_usuario,estado,desafio_socias_habilitada').eq('id', user.id).maybeSingle()
    if (fallo || !perfil) return NextResponse.json({ error: 'No pudimos comprobar el acceso.' }, { status: 503, headers })
    const { hito } = await leerAgenda()
    return NextResponse.json({ hitos: hitoParaAlumna(hito, perfil) }, { headers })
  } catch { return NextResponse.json({ error: 'No pudimos actualizar el próximo encuentro.' }, { status: 503, headers }) }
}
