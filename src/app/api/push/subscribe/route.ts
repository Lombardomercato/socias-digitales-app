import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let subscription: { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
  try {
    subscription = await req.json()
  } catch {
    return NextResponse.json({ error: 'La suscripción no tiene un formato válido.' }, { status: 400 })
  }

  if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    return NextResponse.json({ error: 'Faltan datos para guardar la suscripción.' }, { status: 400 })
  }

  const { error } = await supabase.from('push_subscriptions').upsert({
    alumna_id: user.id,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
  }, { onConflict: 'alumna_id' })

  if (error) {
    return NextResponse.json({ error: 'No pudimos guardar la activación.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
