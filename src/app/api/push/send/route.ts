import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, isAdminSupabaseConfigured } from '@/lib/supabase/admin'
import { perteneceAudiencia } from '@/lib/notifications'
import webpush from 'web-push'
import { esEndpointPushValido } from '@/lib/push-validation'

export async function POST(req: NextRequest) {
  if (req.headers.get('origin') !== req.nextUrl.origin) return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).maybeSingle()
  if (perfil?.rol !== 'admin') return NextResponse.json({ error: 'Sin permiso.' }, { status: 403 })
  const subject = process.env.VAPID_SUBJECT
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!subject || !publicKey || !privateKey || !isAdminSupabaseConfigured()) return NextResponse.json({ error: 'Notificaciones al teléfono no configuradas.' }, { status: 503 })
  let entrada
  try { entrada = await req.json() } catch { return NextResponse.json({ error: 'Mensaje no válido.' }, { status: 400 }) }
  if (!entrada || typeof entrada.avisoId !== 'string' || !/^[0-9a-f-]{36}$/i.test(entrada.avisoId)) return NextResponse.json({ error: 'Aviso no válido.' }, { status: 400 })
  const admin = createAdminClient()
  const { data: aviso, error: errorAviso } = await admin.from('avisos').select('id,titulo,mensaje,destino,audiencias').eq('id', entrada.avisoId).eq('publicado', true).eq('archivado', false).maybeSingle()
  if (errorAviso || !aviso) return NextResponse.json({ error: 'Publicá el aviso antes de notificar.' }, { status: 400 })
  const [{ data: perfiles, error: errorPerfiles }, { data: suscripciones, error: errorSubs }] = await Promise.all([
    admin.from('perfiles').select('id,rol,tipo_usuario,desafio_socias_habilitada'),
    admin.from('push_subscriptions').select('alumna_id,endpoint,p256dh,auth'),
  ])
  if (errorPerfiles || errorSubs) return NextResponse.json({ error: 'No se pudieron preparar los destinatarios.' }, { status: 500 })
  const destinatarias = new Set((perfiles ?? []).filter(p => perteneceAudiencia(p, aviso.audiencias)).map(p => p.id))
  const subs = (suscripciones ?? []).filter(s => destinatarias.has(s.alumna_id) && esEndpointPushValido(s.endpoint))
  // Evita repetir el envío cuando el navegador reintenta una petición.
  const { data: tomada, error: errorToma } = await admin.from('avisos').update({ push_started_at: new Date().toISOString() }).eq('id', aviso.id).is('push_started_at', null).select('id').maybeSingle()
  if (errorToma) return NextResponse.json({ error: 'No se pudo preparar el envío.' }, { status: 500 })
  if (!tomada) return NextResponse.json({ error: 'El aviso al teléfono ya se envió o está en curso. No se repetirá.' }, { status: 409 })
  webpush.setVapidDetails(subject, publicKey, privateKey)
  const payload = JSON.stringify({ title: aviso.titulo, body: aviso.mensaje.slice(0, 500), url: aviso.destino || '/notificaciones' })
  let enviadas = 0
  let fallidas = 0
  for (let i = 0; i < subs.length; i += 10) {
    await Promise.all(subs.slice(i, i + 10).map(async sub => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, { timeout: 5000 })
        enviadas++
      } catch (causa) {
        fallidas++
        const estado = (causa as { statusCode?: number }).statusCode
        // Una falla de red no invalida la suscripción.
        if (estado === 404 || estado === 410) await admin.from('push_subscriptions').delete().eq('alumna_id', sub.alumna_id).eq('endpoint', sub.endpoint)
      }
    }))
  }
  await admin.from('avisos').update({ push_completed_at: new Date().toISOString() }).eq('id', aviso.id)
  return NextResponse.json({ enviadas, fallidas })
}
