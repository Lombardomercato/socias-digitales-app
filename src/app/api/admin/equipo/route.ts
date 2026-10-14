import { createHmac } from 'node:crypto'
import { NextResponse } from 'next/server'
import { autorizarAdmin } from '@/lib/admin-auth'
import {
  createAdminClient,
  isAdminSupabaseConfigured,
} from '@/lib/supabase/admin'
import { normalizarNombre } from '@/lib/perfil-preguntas'
import { enviarConfirmacion } from '@/lib/registration-mail'
import { EMAIL_HEADER } from '@/lib/email-brand'
import { esUuid } from '@/lib/class-management'
import { buscarCuentaEmail } from '@/lib/admin-team'

export const maxDuration = 60
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  )
export async function POST(request: Request) {
  const auth = await autorizarAdmin(request)
  if (auth.error) return auth.error
  if (!isAdminSupabaseConfigured())
    return NextResponse.json(
      { error: 'La administración de cuentas no está configurada.' },
      { status: 503 },
    )
  try {
    const input = await request.json(),
      admin = createAdminClient()
    if (input.action === 'promover') {
      if (!esUuid(input.id) || input.confirmar !== true)
        return NextResponse.json(
          { error: 'Confirmá a qué cuenta darás acceso administrativo.' },
          { status: 400 },
        )
      const { data: target, error: targetError } =
        await admin.auth.admin.getUserById(input.id)
      if (targetError || !target.user?.email_confirmed_at)
        return NextResponse.json(
          {
            error:
              'La cuenta debe confirmar su email antes de recibir este permiso.',
          },
          { status: 400 },
        )
      const { data, error } = await admin
        .from('perfiles')
        .update({ rol: 'admin' })
        .eq('id', input.id)
        .select('id')
        .maybeSingle()
      if (error || !data) throw new Error('promover')
      console.info('admin_team_promoted', {
        actorId: auth.user.id,
        targetId: input.id,
      })
      return NextResponse.json({
        ok: true,
        mensaje:
          'Acceso administrativo habilitado. Puede ingresar con su contraseña actual.',
      })
    }
    if (input.action !== 'invitar' || input.confirmar !== true)
      return NextResponse.json(
        { error: 'Confirmá la invitación administrativa.' },
        { status: 400 },
      )
    if (!process.env.RESEND_API_KEY)
      return NextResponse.json(
        { error: 'El email de invitación no está configurado.' },
        { status: 503 },
      )
    const email =
      typeof input.email === 'string' ? input.email.trim().toLowerCase() : ''
    const nombre =
      typeof input.nombre === 'string' ? normalizarNombre(input.nombre) : ''
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254 ||
      nombre.length < 2 ||
      nombre.length > 120
    )
      return NextResponse.json(
        { error: 'Revisá el nombre y el email.' },
        { status: 400 },
      )
    // Existing students must be explicitly selected and promoted, not silently
    // elevated by an invitation or by editable signup metadata.
    const existing = await buscarCuentaEmail(admin, email)
    const { data: existingPerfil, error: lookupError } = existing
      ? await admin
          .from('perfiles')
          .select('id,rol')
          .eq('id', existing.id)
          .maybeSingle()
      : { data: null, error: null }
    if (lookupError) throw lookupError
    if (existing && existingPerfil?.rol !== 'admin')
      return NextResponse.json(
        {
          error:
            'Esta cuenta ya existe. Usá “Dar acceso administrativo” más abajo.',
        },
        { status: 409 },
      )
    if (existing) {
      if (existing.email_confirmed_at)
        return NextResponse.json(
          {
            error:
              'Esta persona ya es administradora. Puede ingresar o recuperar su contraseña desde el login.',
          },
          { status: 409 },
        )
    }
    const hash = (s: string) =>
      createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY!)
        .update(s)
        .digest('hex')
    const { data: reservation, error: reserveError } = await admin.rpc(
      'reserve_registration_mail',
      {
        p_email: email,
        p_email_hash: hash('email:' + email),
        p_ip_hash: hash('admin:' + auth.user.id),
      },
    )
    if (reserveError) throw reserveError
    if (!reservation?.allowed)
      return NextResponse.json(
        { error: 'Esperá un minuto antes de reenviar esta invitación.' },
        { status: 429 },
      )
    const site = (
      process.env.NEXT_PUBLIC_SITE_URL || 'https://app.sociasdigitales.com'
    ).replace(/\/$/, '')
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        data: { nombre, password_set: false },
        redirectTo: `${site}/auth/callback`,
      },
    })
    if (error || !data.user?.id || !data.properties?.hashed_token)
      throw new Error('invite')
    const { data: profile, error: roleError } = await admin
      .from('perfiles')
      .update({ rol: 'admin', nombre })
      .eq('id', data.user.id)
      .select('id')
      .maybeSingle()
    if (roleError || !profile) throw new Error('perfil')
    const link = `${site}/confirmar#token_hash=${encodeURIComponent(data.properties.hashed_token)}&flow=invite`
    const sent = await enviarConfirmacion(
      {
        from:
          process.env.RESEND_FROM ||
          'Flor · Socias Digitales <no-reply@sociasdigitales.com>',
        to: [email],
        subject: 'Tu acceso al equipo · Socias Digitales',
        html: `<div style="background:#FAF7F3;padding:32px 16px;color:#211C19;font-family:Arial,sans-serif"><div style="max-width:560px;margin:auto">${EMAIL_HEADER}<h1>Bienvenida al equipo</h1><p>Hola, ${esc(nombre)}.</p><p>Te invitamos a administrar Socias Digitales: clases, alumnas y comunicaciones.</p><p>Confirmá tu email y elegí tu propia contraseña.</p><a href="${link}" style="display:block;background:#294A38;color:white;text-align:center;padding:18px;border-radius:12px;text-decoration:none">ACTIVAR MI ACCESO</a><p>Si no esperabas esta invitación, ignorá este mensaje.</p><p>Equipo Socias Digitales</p></div></div>`,
        text: `Hola, ${nombre}. Te invitamos al equipo de Socias Digitales. Confirmá tu email y creá tu contraseña: ${link}`,
      },
      process.env.RESEND_API_KEY,
    )
    console.info('admin_team_invited', {
      actorId: auth.user.id,
      targetId: data.user.id,
      emailAccepted: sent.ok,
    })
    if (!sent.ok)
      return NextResponse.json(
        {
          error:
            'La cuenta quedó preparada, pero el correo no fue aceptado. Reenviá la invitación en un minuto.',
        },
        { status: 502 },
      )
    return NextResponse.json({
      ok: true,
      mensaje:
        'Invitación aceptada por el proveedor de email. La persona debe confirmar el enlace y crear su contraseña; revisá también spam.',
    })
  } catch (error) {
    console.error('admin_team_failed', {
      code: (error as { code?: string })?.code,
    })
    return NextResponse.json(
      {
        error:
          'No pudimos completar la acción. Revisá los datos e intentá nuevamente.',
      },
      { status: 500 },
    )
  }
}
