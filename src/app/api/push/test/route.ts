import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { esEndpointPushValido } from '@/lib/push-validation'
import webpush from 'web-push'

export async function POST(req: NextRequest) {
  if (req.headers.get('origin') !== req.nextUrl.origin) return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Iniciá sesión.' }, { status: 401 })
  let input
  try { input = await req.json() } catch { return NextResponse.json({ error: 'Solicitud no válida.' }, { status: 400 }) }
  if (!esEndpointPushValido(input?.endpoint)) return NextResponse.json({ error: 'Dispositivo no válido.' }, { status: 400 })
  const { data: sub, error } = await supabase.from('push_subscriptions').select('endpoint,p256dh,auth').eq('alumna_id', user.id).eq('endpoint', input.endpoint).maybeSingle()
  if (error || !sub) return NextResponse.json({ error: 'Activá primero este dispositivo.' }, { status: 409 })
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT
  if (!publicKey || !privateKey || !subject) return NextResponse.json({ error: 'Notificaciones no disponibles.' }, { status: 503 })
  const { data: reservado, error: reservaError } = await supabase.from('push_subscriptions')
    .update({ ultima_prueba_at: new Date().toISOString() }).eq('alumna_id', user.id).eq('endpoint', sub.endpoint)
    .or('ultima_prueba_at.is.null,ultima_prueba_at.lt.' + new Date(Date.now() - 60_000).toISOString()).select('id').maybeSingle()
  if (reservaError) return NextResponse.json({ error: 'No pudimos preparar la prueba.' }, { status: 500 })
  if (!reservado) return NextResponse.json({ error: 'Esperá un minuto antes de repetir la prueba.' }, { status: 429 })
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey)
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify({ title: 'Socias Digitales', body: 'Tus notificaciones están listas en este dispositivo.', url: '/perfil' }), { timeout: 5000 })
    return NextResponse.json({ ok: true, mensaje: 'Prueba enviada. Revisá las notificaciones de tu dispositivo.' })
  } catch (causa) {
    const status = (causa as { statusCode?: number }).statusCode
    if (status === 404 || status === 410) {
      await supabase.from('push_subscriptions').delete().eq('alumna_id', user.id).eq('endpoint', sub.endpoint)
      return NextResponse.json({ error: 'La activación venció. Desactivá y volvé a activar este dispositivo.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'No pudimos enviar la prueba. Intentá nuevamente.' }, { status: 502 })
  }
}
