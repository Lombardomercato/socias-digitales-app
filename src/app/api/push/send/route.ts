import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, isAdminSupabaseConfigured } from '@/lib/supabase/admin'
import webpush from 'web-push'

function configurarWebPush() {
  const subject = process.env.VAPID_SUBJECT
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY

  if (!subject || !publicKey || !privateKey) return false

  webpush.setVapidDetails(subject, publicKey, privateKey)
  return true
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Solo admin
  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).maybeSingle()
  if (perfil?.rol !== 'admin') return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

  if (!configurarWebPush()) {
    return NextResponse.json({ error: 'Notificaciones no configuradas' }, { status: 503 })
  }
  if (!isAdminSupabaseConfigured()) {
    return NextResponse.json({ error: 'Falta configurar el acceso seguro del servidor' }, { status: 503 })
  }

  let payloadEntrada: { title?: string; body?: string; url?: string }
  try {
    payloadEntrada = await req.json()
  } catch {
    return NextResponse.json({ error: 'El mensaje no tiene un formato válido' }, { status: 400 })
  }
  const title = payloadEntrada.title?.trim()
  const body = payloadEntrada.body?.trim()
  const url = payloadEntrada.url?.trim()
  if (!title || !body || title.length > 120 || body.length > 500 || (url && (!url.startsWith('/') || url.startsWith('//')))) {
    return NextResponse.json({ error: 'Revisá el título, el mensaje y el destino' }, { status: 400 })
  }

  // Solo cuentas habilitadas para el Desafío Socias y administradoras.
  const admin = createAdminClient()
  const [{ data: perfiles, error: perfilesError }, { data: todasLasSuscripciones, error: suscripcionesError }] = await Promise.all([
    admin.from('perfiles').select('id').or('rol.eq.admin,desafio_socias_habilitada.eq.true'),
    admin.from('push_subscriptions').select('*'),
  ])
  if (perfilesError || suscripcionesError) {
    return NextResponse.json({ error: 'No pudimos preparar los destinatarios' }, { status: 500 })
  }
  const habilitadas = new Set((perfiles ?? []).map(perfil => perfil.id))
  const subs = (todasLasSuscripciones ?? []).filter(sub => habilitadas.has(sub.alumna_id))
  if (subs.length === 0) return NextResponse.json({ enviadas: 0 })

  const payload = JSON.stringify({ title, body, url: url || '/inicio' })

  let enviadas = 0
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
      enviadas++
    } catch {
      // Suscripción expirada — eliminar
      await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
    }
  }

  return NextResponse.json({ enviadas })
}
