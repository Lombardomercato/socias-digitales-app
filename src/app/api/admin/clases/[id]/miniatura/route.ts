import { NextResponse } from 'next/server'
import { autorizarAdmin } from '@/lib/admin-auth'
import { esUuid } from '@/lib/class-management'
import { claveMiniatura, esJpegMiniatura, revisionMiniatura, MAX_MINIATURA_BYTES } from '@/lib/class-poster'
import { pedirR2 } from '@/lib/r2-upload'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await autorizarAdmin(request)
  if (auth.error) return auth.error
  const { id } = await context.params
  if (!esUuid(id) || request.headers.get('content-type') !== 'image/jpeg') return NextResponse.json({ error: 'Miniatura no válida.' }, { status: 400 })
  const bytes = new Uint8Array(await request.arrayBuffer())
  if (bytes.length > MAX_MINIATURA_BYTES || !esJpegMiniatura(bytes)) return NextResponse.json({ error: 'Miniatura no válida.' }, { status: 400 })
  const { data: clase, error } = await auth.supabase.from('clases').select('video_key').eq('id', id).maybeSingle()
  if (error || !clase?.video_key) return NextResponse.json({ error: 'Video no disponible.' }, { status: 404 })
  if (new URL(request.url).searchParams.get('revision') !== revisionMiniatura(clase.video_key)) return NextResponse.json({ error: 'El video cambió; recargá la clase.' }, { status: 409 })
  try {
    const saved = await pedirR2('PUT', claveMiniatura(id, clase.video_key), {}, bytes, 'image/jpeg', { 'If-None-Match': '*' })
    if (!saved.ok && saved.status !== 412) throw new Error('miniatura')
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'No pudimos guardar la miniatura. El video no se modifica.' }, { status: 502 })
  }
}
