import { NextResponse } from 'next/server'
import { EMAIL_HEADER } from '@/lib/email-brand'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, isAdminSupabaseConfigured } from '@/lib/supabase/admin'

type Accion = 'habilitar' | 'bloquear' | 'rechazar' | 'reenviar_bienvenida'

function escaparHtml(texto: string) {
  const entidades: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
  return texto.replace(/[&<>"']/g, caracter => entidades[caracter] ?? caracter)
}

function emailBienvenida(nombre: string, siteUrl: string) {
  const nombreSeguro = escaparHtml(nombre)
  const saludo = nombreSeguro ? `¡Bienvenida al Desafío Socias, ${nombreSeguro}!` : '¡Bienvenida al Desafío Socias!'
  const url = `${siteUrl.replace(/\/$/, '')}/login`
  return {
    subject: 'Bienvenida al Desafío Socias',
    html: `<!doctype html><html lang="es"><body style="margin:0;background:#f4efea;font-family:Arial,sans-serif;color:#2b2522"><div style="max-width:600px;margin:32px auto;background:#fff;padding:36px 28px;border-radius:20px">${EMAIL_HEADER}<p style="margin:0 0 18px;color:#294a38;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase">Desafío Socias</p><h1 style="margin:0 0 20px;font-size:30px;line-height:1.2">${saludo}</h1><p style="font-size:16px;line-height:1.6">Tu acceso ya está habilitado. Desde la plataforma podés entrar al espacio de lanzamiento y volver a ver las clases grabadas.</p><p style="margin:28px 0"><a href="${url}" style="display:inline-block;background:#294a38;color:#fff;text-decoration:none;padding:15px 24px;border-radius:999px;font-weight:bold">Entrar a la plataforma</a></p><p style="font-size:14px;line-height:1.6;color:#6b625e">Ingresá con el email y la contraseña que usaste al registrarte.</p><p style="margin:28px 0 0;font-size:14px;color:#6b625e">Nos vemos adentro,<br>Flor y el equipo de Socias Digitales</p></div></body></html>`,
    text: `${saludo}\n\nTu acceso ya está habilitado. Desde la plataforma podés entrar al espacio de lanzamiento y volver a ver las clases grabadas.\n\nIngresá acá: ${url}\n\nUsá el email y la contraseña que elegiste al registrarte.\n\nNos vemos adentro,\nFlor y el equipo de Socias Digitales`,
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Iniciá sesión para continuar.' }, { status: 401 })

  const { data: perfilActual } = await supabase.from('perfiles').select('rol').eq('id', user.id).maybeSingle()
  if (perfilActual?.rol !== 'admin') return NextResponse.json({ error: 'Solo Flor puede gestionar estas habilitaciones.' }, { status: 403 })
  if (!isAdminSupabaseConfigured()) return NextResponse.json({ error: 'Falta configurar el acceso seguro del servidor.' }, { status: 503 })

  let body: { perfilId?: string; accion?: Accion }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 }) }
  const perfilId = body.perfilId
  const accion = body.accion
  if (!perfilId || !/^[0-9a-f-]{36}$/i.test(perfilId) || !['habilitar', 'bloquear', 'rechazar', 'reenviar_bienvenida'].includes(accion ?? '')) {
    return NextResponse.json({ error: 'Elegí una cuenta y una acción válidas.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: alumna, error: perfilError } = await admin.from('perfiles')
    .select('id, nombre, rol, tipo_usuario, desafio_socias_habilitada, desafio_socias_bienvenida_enviada_at')
    .eq('id', perfilId)
    .maybeSingle()
  if (perfilError || !alumna) return NextResponse.json({ error: 'No encontramos esa cuenta.' }, { status: 404 })
  if (alumna.rol === 'admin') return NextResponse.json({ error: 'La cuenta administradora no se modifica desde aquí.' }, { status: 400 })
  if (alumna.tipo_usuario !== 'desafio') return NextResponse.json({ error: 'Esta cuenta no está asignada al Desafío Socias.' }, { status: 409 })

  if (accion === 'bloquear') {
    const { error } = await admin.from('perfiles').update({
      desafio_socias_habilitada: false,
      desafio_socias_habilitada_at: null,
      desafio_socias_habilitada_por: null,
      desafio_socias_estado: 'bloqueada',
    }).eq('id', perfilId)
    if (error) return NextResponse.json({ error: 'No se pudo bloquear el acceso.' }, { status: 500 })
    return NextResponse.json({ ok: true, habilitada: false })
  }

  if (accion === 'rechazar') {
    const { error } = await admin.from('perfiles').update({
      desafio_socias_habilitada: false,
      desafio_socias_habilitada_at: null,
      desafio_socias_habilitada_por: null,
      desafio_socias_estado: 'rechazada',
    }).eq('id', perfilId)
    if (error) return NextResponse.json({ error: 'No se pudo rechazar la solicitud.' }, { status: 500 })
    return NextResponse.json({ ok: true, habilitada: false, rechazada: true })
  }

  if (accion === 'reenviar_bienvenida' && !alumna.desafio_socias_habilitada) {
    return NextResponse.json({ error: 'Primero habilitá el acceso.' }, { status: 409 })
  }

  if (accion === 'habilitar' && !alumna.desafio_socias_habilitada) {
    const { error } = await admin.from('perfiles').update({
      desafio_socias_habilitada: true,
      desafio_socias_habilitada_at: new Date().toISOString(),
      desafio_socias_habilitada_por: user.id,
      desafio_socias_estado: 'habilitada',
    }).eq('id', perfilId)
    if (error) return NextResponse.json({ error: 'No se pudo habilitar el acceso.' }, { status: 500 })
  }

  if (accion === 'habilitar' && alumna.desafio_socias_bienvenida_enviada_at) {
    return NextResponse.json({ ok: true, habilitada: true, emailEnviado: true, yaEnviada: true })
  }

  const { data: authResult, error: authError } = await admin.auth.admin.getUserById(perfilId)
  const email = authResult?.user?.email
  if (authError || !email) return NextResponse.json({ ok: true, habilitada: true, emailEnviado: false, aviso: 'Acceso habilitado, pero no encontramos el correo de esta cuenta.' })

  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM
  if (!apiKey || !from) return NextResponse.json({ ok: true, habilitada: true, emailEnviado: false, aviso: 'Acceso habilitado. Falta conectar Resend para enviar la bienvenida.' })

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.sociasdigitales.com'
  const mensaje = emailBienvenida(alumna.nombre?.trim().split(/\s+/)[0] ?? '', siteUrl)
  const envio = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [email], subject: mensaje.subject, html: mensaje.html, text: mensaje.text }),
    cache: 'no-store',
  })
  if (!envio.ok) {
    const detalle = await envio.text().catch(() => '')
    console.error('Resend no pudo enviar bienvenida al Desafío Socias:', envio.status, detalle.slice(0, 500))
    return NextResponse.json({ ok: true, habilitada: true, emailEnviado: false, aviso: 'Acceso habilitado, pero Resend no pudo enviar el correo. Podés reintentarlo desde este panel.' })
  }

  const { error: registroError } = await admin.from('perfiles').update({ desafio_socias_bienvenida_enviada_at: new Date().toISOString() }).eq('id', perfilId)
  if (registroError) console.error('No se pudo guardar la marca de bienvenida enviada:', registroError.message)
  return NextResponse.json({ ok: true, habilitada: true, emailEnviado: true })
}
