import { createClient } from '@/lib/supabase/server'
import { createAdminClient, isAdminSupabaseConfigured } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
  if (perfil?.rol !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { emails } = await request.json()
  if (!emails || !Array.isArray(emails)) return NextResponse.json({ error: 'Lista de emails inválida' }, { status: 400 })

  if (!isAdminSupabaseConfigured()) {
    return NextResponse.json({ error: 'La invitación por email todavía no está configurada' }, { status: 503 })
  }

  const admin = createAdminClient()

  const resultados: { email: string; ok: boolean; mensaje: string }[] = []
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://app.sociasdigitales.com').replace(/\/$/, '')

  for (const email of emails) {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !trimmed.includes('@')) continue

    const { error } = await admin.auth.admin.inviteUserByEmail(trimmed, {
      redirectTo: `${siteUrl}/auth/callback`,
      data: { password_set: false },
    })

    if (error) {
      console.error('Error invitando', trimmed, error)
      resultados.push({ email: trimmed, ok: false, mensaje: error.message || error.code || JSON.stringify(error) || 'Error desconocido' })
    } else {
      resultados.push({ email: trimmed, ok: true, mensaje: 'Invitación enviada' })
    }
  }

  return NextResponse.json({ resultados })
}
