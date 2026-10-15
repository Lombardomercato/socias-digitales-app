import { NextResponse } from 'next/server'
import { autorizarAdmin } from '@/lib/admin-auth'
import { createAdminClient, isAdminSupabaseConfigured } from '@/lib/supabase/admin'
import { habilitarAccesosPrueba, leerAccesosPrueba } from '@/lib/trial-access'

const headers = { 'Cache-Control': 'private, no-store' }
export async function GET() {
  try {
    const auth = await autorizarAdmin()
    if (auth.error) return auth.error
    if (!isAdminSupabaseConfigured()) throw new Error('Servicio no configurado.')
    return NextResponse.json(await leerAccesosPrueba(createAdminClient()), { headers })
  } catch { return NextResponse.json({ error: 'No pudimos comprobar la cuenta de prueba.' }, { status: 503, headers }) }
}
export async function POST(request: Request) {
  try {
    const auth = await autorizarAdmin(request)
    if (auth.error) return auth.error
    let x
    try { const raw = await request.text(); if (raw.length > 200) throw new Error(); x = JSON.parse(raw) } catch { return NextResponse.json({ error: 'Solicitud no válida.' }, { status: 400 }) }
    if (!x || x.habilitar !== true || Object.keys(x).length !== 1) return NextResponse.json({ error: 'Solo se puede habilitar la cuenta de prueba definida por la plataforma.' }, { status: 400 })
    if (!isAdminSupabaseConfigured()) throw new Error('Servicio no configurado.')
    return NextResponse.json(await habilitarAccesosPrueba(createAdminClient(), auth.user.id), { headers })
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'No pudimos completar los permisos.' }, { status: 503, headers }) }
}
