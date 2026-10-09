import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, isAdminSupabaseConfigured } from '@/lib/supabase/admin'
import { verificarTokenBaja } from '@/lib/email-consent'

// GET no modifica preferencias: no dar de baja al explorar un enlace/scanner.
export async function GET() { return NextResponse.json({ error: 'Confirmá la baja desde el enlace del correo.' }, { status: 405 }) }
export async function POST(req: NextRequest) {
  if (!isAdminSupabaseConfigured()) return NextResponse.json({ error: 'No disponible.' }, { status: 503 })
  const tokenUrl = req.nextUrl.searchParams.get('token')
  let token: unknown = tokenUrl
  if (!tokenUrl) {
    if (req.headers.get('origin') !== req.nextUrl.origin) return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 })
    try { token = (await req.json()).token } catch { return NextResponse.json({ error: 'Enlace no válido.' }, { status: 400 }) }
  }
  const userId = verificarTokenBaja(token, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  if (!userId) return NextResponse.json({ error: 'El enlace venció o no es válido. Podés desactivar los emails desde tu perfil.' }, { status: 400 })
  const { error } = await createAdminClient().from('preferencias_email').upsert({ usuaria_id: userId, acepta_email: false, origen: 'baja' })
  if (error) return NextResponse.json({ error: 'No pudimos guardar la baja. Reintentá.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
