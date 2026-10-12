import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { leerAvisosSinLeer } from '@/lib/unread-notices'

export async function GET() {
  const headers = { 'Cache-Control': 'private, no-store' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Iniciá sesión.' }, { status: 401, headers })
  const { data: perfil, error } = await supabase.from('perfiles').select('rol').eq('id', user.id).maybeSingle()
  if (error || !perfil) return NextResponse.json({ error: 'No pudimos consultar tu cuenta.' }, { status: 503, headers })
  if (perfil.rol === 'admin') return NextResponse.json({ error: 'Este contador es para alumnas.' }, { status: 403, headers })
  const resumen = await leerAvisosSinLeer(supabase, user.id)
  return NextResponse.json(resumen, { status: resumen.errorCarga ? 503 : 200, headers })
}
