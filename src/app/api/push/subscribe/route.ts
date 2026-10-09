import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { esEndpointPushValido, esSuscripcionPushValida } from '@/lib/push-validation'
import { createHash } from 'node:crypto'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Iniciá sesión.' }, { status: 401 })
  const { data, error } = await supabase.from('push_subscriptions').select('endpoint').eq('alumna_id', user.id)
  if (error) return NextResponse.json({ error: 'No pudimos consultar tus dispositivos.' }, { status: 500 })
  const dispositivos = (data || []).map((sub: { endpoint: string }) => createHash('sha256').update(sub.endpoint).digest('hex'))
  return NextResponse.json({ dispositivos }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: NextRequest) {
  if (req.headers.get('origin') !== req.nextUrl.origin) return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let subscription: { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
  try {
    subscription = await req.json()
  } catch {
    return NextResponse.json({ error: 'La suscripción no tiene un formato válido.' }, { status: 400 })
  }

  if (!esSuscripcionPushValida(subscription)) {
    return NextResponse.json({ error: 'Faltan datos para guardar la suscripción.' }, { status: 400 })
  }

  const { error } = await supabase.from('push_subscriptions').upsert({
    alumna_id: user.id,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
  }, { onConflict: 'alumna_id,endpoint' })

  if (error) {
    return NextResponse.json({ error: 'No pudimos guardar la activación.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  if (req.headers.get('origin') !== req.nextUrl.origin) return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Iniciá sesión.' }, { status: 401 })
  let input
  try { input = await req.json() } catch { return NextResponse.json({ error: 'Solicitud no válida.' }, { status: 400 }) }
  if (!esEndpointPushValido(input?.endpoint)) return NextResponse.json({ error: 'Dispositivo no válido.' }, { status: 400 })
  const { error } = await supabase.from('push_subscriptions').delete().eq('alumna_id', user.id).eq('endpoint', input.endpoint)
  if (error) return NextResponse.json({ error: 'No pudimos desactivar este dispositivo.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
