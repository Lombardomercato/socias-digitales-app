import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, isAdminSupabaseConfigured } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Iniciá sesión.' }, { status: 401 })
  const { data, error } = await supabase.from('preferencias_email').select('acepta_email').eq('usuaria_id', user.id).maybeSingle()
  if (error) return NextResponse.json({ error: 'No pudimos leer tu preferencia.' }, { status: 500 })
  return NextResponse.json({ acepta_email: data?.acepta_email === true }, { headers: { 'Cache-Control': 'private, no-store' } })
}

export async function POST(req: NextRequest) {
  if (req.headers.get('origin') !== req.nextUrl.origin) return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Iniciá sesión.' }, { status: 401 })
  let input
  try { input = await req.json() } catch { return NextResponse.json({ error: 'Preferencia no válida.' }, { status: 400 }) }
  if (typeof input?.acepta_email !== 'boolean') return NextResponse.json({ error: 'Preferencia no válida.' }, { status: 400 })
  if (!isAdminSupabaseConfigured()) return NextResponse.json({ error: 'No disponible. Reintentá más tarde.' }, { status: 503 })
  const { error } = await createAdminClient().from('preferencias_email').upsert({ usuaria_id: user.id, acepta_email: input.acepta_email, origen: 'perfil' })
  if (error) return NextResponse.json({ error: 'No pudimos guardar tu preferencia.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
