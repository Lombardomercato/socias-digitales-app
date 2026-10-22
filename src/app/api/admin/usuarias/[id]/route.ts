import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { esUuid } from '@/lib/class-management'
import { CAMPOS_VERSION_FICHA, cambiosPerfil, mismaVersionFicha, validarCambioFicha } from '@/lib/admin-profile-update'

const columnas = 'id,nombre,whatsapp,pais,tipo_usuario,estado,rol,desafio_socias_habilitada,desafio_socias_estado,desafio_socias_habilitada_at,desafio_socias_habilitada_por'
const headers = { 'Cache-Control': 'private, no-store' }
const responder = (error: string, status: number) => NextResponse.json({ error }, { status, headers })

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (request.headers.get('origin') !== new URL(request.url).origin) return responder('Solicitud no permitida.', 403)
    const { id } = await context.params
    if (!esUuid(id)) return responder('Cuenta no válida.', 400)
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return responder('Iniciá sesión nuevamente.', 401)
    const { data: administradora, error: adminError } = await supabase.from('perfiles').select('rol').eq('id', user.id).maybeSingle()
    if (adminError) return responder('No pudimos verificar tu permiso.', 503)
    if (administradora?.rol !== 'admin') return responder('Solo administradores pueden cambiar una ficha.', 403)
    let solicitud
    try {
      const raw = await request.text()
      if (raw.length > 4000) return responder('La solicitud es demasiado grande.', 413)
      solicitud = validarCambioFicha(JSON.parse(raw))
    } catch (error) { return responder(error instanceof Error ? error.message : 'Revisá los datos de la ficha.', 400) }
    const { data: actual, error: lecturaError } = await supabase.from('perfiles').select(columnas).eq('id', id).maybeSingle()
    if (lecturaError) return responder('No pudimos leer esa cuenta. No se guardaron cambios.', 503)
    if (!actual) return responder('No encontramos esa cuenta.', 404)
    if (actual.rol === 'admin') return responder('Las cuentas administradoras se gestionan desde Equipo.', 403)
    if (!mismaVersionFicha(actual, solicitud.esperado)) return responder('La ficha cambió desde que la abriste. Cerrala y recargá la lista antes de guardar.', 409)
    const patch = cambiosPerfil(solicitud.cambios, actual)
    // Compare-and-set sobre columnas reales bajo la sesión/RLS de Flor. Nunca
    // usar service_role para transformar una denegación en un guardado exitoso.
    let query = supabase.from('perfiles').update(patch).eq('id', id).neq('rol', 'admin')
    for (const campo of CAMPOS_VERSION_FICHA) query = solicitud.esperado[campo] === null ? query.is(campo, null) : query.eq(campo, solicitud.esperado[campo])
    const { data: guardado, error: guardadoError } = await query.select(columnas).maybeSingle()
    if (guardadoError) return responder('No se pudieron guardar los cambios. Revisá tu permiso y volvé a intentar.', 503)
    if (!guardado) return responder('No se confirmó ningún cambio. La ficha pudo cambiar o tu permiso no permite guardarla; cerrala y recargá la lista.', 409)
    if (guardado.id !== id || Object.entries(patch).some(([campo, valor]) => guardado[campo as keyof typeof guardado] !== valor)) return responder('No pudimos confirmar todos los cambios. Recargá la lista y comprobá la ficha antes de reintentar.', 503)
    return NextResponse.json({ ok: true, perfil: guardado }, { headers })
  } catch { return responder('No pudimos confirmar el guardado. Revisá tu conexión y recargá la ficha antes de reintentar.', 503) }
}
