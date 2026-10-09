import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AUDIENCIAS, esDestinoValido } from '@/lib/notifications'

export async function POST(req: NextRequest) {
  if (req.headers.get('origin') !== req.nextUrl.origin) return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Iniciá sesión.' }, { status: 401 })
  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).maybeSingle()
  if (perfil?.rol !== 'admin') return NextResponse.json({ error: 'Sin permiso.' }, { status: 403 })
  let entrada
  try { entrada = await req.json() } catch { return NextResponse.json({ error: 'Mensaje no válido.' }, { status: 400 }) }
  if (!entrada || typeof entrada !== 'object') return NextResponse.json({ error: 'Mensaje no válido.' }, { status: 400 })
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (typeof entrada.id !== 'string' || !uuid.test(entrada.id)) return NextResponse.json({ error: 'Identificador no válido.' }, { status: 400 })
  if (entrada.accion === 'archivar') {
    const { data, error } = await supabase.from('avisos').update({ archivado: true }).eq('id', entrada.id).select('id').maybeSingle()
    if (error || !data) return NextResponse.json({ error: 'No se pudo archivar el aviso.' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }
  if (entrada.accion === 'publicar') {
    const { data, error } = await supabase.from('avisos').update({ publicado: true }).eq('id', entrada.id).eq('archivado', false).select('id').maybeSingle()
    if (error || !data) return NextResponse.json({ error: 'No se pudo publicar el borrador.' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }
  if (entrada.accion !== undefined) return NextResponse.json({ error: 'Acción no válida.' }, { status: 400 })
  const titulo = typeof entrada.titulo === 'string' ? entrada.titulo.trim() : ''
  const mensaje = typeof entrada.mensaje === 'string' ? entrada.mensaje.trim() : ''
  const audiencias = entrada.audiencias
  if (!titulo || titulo.length > 120 || !mensaje || mensaje.length > 4000 || !Array.isArray(audiencias) || !audiencias.length || !audiencias.every(a => AUDIENCIAS.some(item => item.id === a)) || (entrada.destino !== null && !esDestinoValido(entrada.destino)) || typeof entrada.publicado !== 'boolean') {
    return NextResponse.json({ error: 'Revisá el título, mensaje y destinatarias.' }, { status: 400 })
  }
  const { data, error } = await supabase.from('avisos').insert({ id: entrada.id, titulo, mensaje, audiencias: [...new Set(audiencias)], destino: entrada.destino, publicado: entrada.publicado, autora_id: user.id }).select('id').single()
  if (error) {
    // Una respuesta perdida no debe provocar una segunda publicación.
    if (error.code === '23505') {
      const { data: existente } = await supabase.from('avisos').select('id,titulo,mensaje,audiencias,destino,publicado,archivado').eq('id', entrada.id).eq('autora_id', user.id).maybeSingle()
      if (existente) {
        const mismasAudiencias = JSON.stringify([...existente.audiencias].sort()) === JSON.stringify([...new Set(audiencias)].sort())
        if (!existente.archivado && existente.titulo === titulo && existente.mensaje === mensaje && existente.destino === entrada.destino && existente.publicado === entrada.publicado && mismasAudiencias) return NextResponse.json({ ok: true, id: existente.id })
        return NextResponse.json({ error: 'Este aviso ya fue guardado con otros datos. Revisá el historial antes de volver a publicar.' }, { status: 409 })
      }
    }
    return NextResponse.json({ error: 'No se pudo guardar el aviso. Intentá nuevamente.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, id: data.id })
}
