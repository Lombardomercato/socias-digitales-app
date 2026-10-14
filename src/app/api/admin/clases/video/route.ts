import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { autorizarAdmin } from '@/lib/admin-auth'
import { esUuid, TAMANO_PARTE, validarVideo } from '@/lib/class-management'
import {
  r2Configurado,
  pedirR2,
  xmlValue,
  xmlEscape,
  leerPartes,
  partesCompletas,
  firmarParte,
  tokenCarga,
  leerTokenCarga,
} from '@/lib/r2-upload'

export const maxDuration = 60
export async function POST(request: Request) {
  const auth = await autorizarAdmin(request)
  if (auth.error) return auth.error
  if (!r2Configurado())
    return NextResponse.json(
      { error: 'La carga de videos no está configurada.' },
      { status: 503 },
    )
  try {
    const input = await request.json()
    if (input.action === 'iniciar') {
      if (!esUuid(input.claseId) || !validarVideo(input.nombre, input.bytes))
        return NextResponse.json(
          { error: 'Elegí un archivo MP4 de hasta 8 GB.' },
          { status: 400 },
        )
      const { data: clase, error } = await auth.supabase
        .from('clases')
        .select('id,video_key')
        .eq('id', input.claseId)
        .maybeSingle()
      if (error || !clase)
        return NextResponse.json(
          { error: 'Guardá la ficha de la clase primero.' },
          { status: 404 },
        )
      const key = `clases/${clase.id}/${randomUUID()}.mp4`
      const result = await pedirR2(
        'POST',
        key,
        { uploads: '' },
        '',
        'video/mp4',
      )
      const xml = await result.text(),
        uploadId = xmlValue(xml, 'UploadId')
      if (!result.ok || !uploadId) throw new Error('R2 iniciar')
      const token = tokenCarga({
        userId: auth.user.id,
        claseId: clase.id,
        key,
        uploadId,
        bytes: input.bytes,
        anterior: clase.video_key,
        exp: Date.now() + 12 * 60 * 60 * 1000,
      })
      return NextResponse.json(
        { token, partSize: TAMANO_PARTE },
        { headers: { 'Cache-Control': 'private, no-store' } },
      )
    }
    const state = leerTokenCarga(input.token, auth.user.id)
    if (!state)
      return NextResponse.json(
        { error: 'La sesión de carga venció. Volvé a elegir el archivo.' },
        { status: 400 },
      )
    const { data: clase, error } = await auth.supabase
      .from('clases')
      .select('id,video_key')
      .eq('id', state.claseId)
      .maybeSingle()
    if (error || !clase)
      return NextResponse.json(
        { error: 'La clase ya no está disponible.' },
        { status: 404 },
      )
    if (input.action === 'cancelar') {
      const result = await pedirR2('DELETE', state.key, {
        uploadId: state.uploadId,
      })
      if (!result.ok && result.status !== 404) throw new Error('R2 cancelar')
      return NextResponse.json({ ok: true })
    }
    if (clase.video_key !== state.anterior && clase.video_key !== state.key)
      return NextResponse.json(
        { error: 'Otro administrador cambió el video. Recargá la clase.' },
        { status: 409 },
      )
    if (input.action === 'parte') {
      if (
        !Number.isInteger(input.numero) ||
        input.numero < 1 ||
        input.numero > Math.ceil(state.bytes / TAMANO_PARTE)
      )
        return NextResponse.json({ error: 'Parte inválida.' }, { status: 400 })
      return NextResponse.json(
        { url: firmarParte(state.key, state.uploadId, input.numero) },
        { headers: { 'Cache-Control': 'private, no-store' } },
      )
    }
    if (input.action !== 'finalizar')
      return NextResponse.json({ error: 'Acción inválida.' }, { status: 400 })
    // A retry after a completed response never uploads or publishes a second class.
    if (clase.video_key === state.key) return NextResponse.json({ ok: true })
    const head = await pedirR2('HEAD', state.key)
    if (!head.ok) {
      const list = await pedirR2('GET', state.key, {
        uploadId: state.uploadId,
        'max-parts': '1000',
      })
      const parts = leerPartes(await list.text())
      if (!list.ok || !partesCompletas(parts, state.bytes))
        return NextResponse.json(
          {
            error:
              'Faltan partes del video. Reintentá la carga sin cerrar esta ventana.',
          },
          { status: 409 },
        )
      const body = `<CompleteMultipartUpload>${parts.map((p) => `<Part><PartNumber>${p.number}</PartNumber><ETag>${xmlEscape(p.etag)}</ETag></Part>`).join('')}</CompleteMultipartUpload>`
      const completed = await pedirR2(
        'POST',
        state.key,
        { uploadId: state.uploadId },
        body,
        'application/xml',
      )
      const xml = await completed.text()
      if (!completed.ok || xml.includes('<Error>'))
        throw new Error('R2 finalizar')
    }
    const verified = await pedirR2('HEAD', state.key)
    if (
      !verified.ok ||
      Number(verified.headers.get('content-length')) !== state.bytes ||
      verified.headers.get('content-type')?.split(';')[0] !== 'video/mp4'
    )
      throw new Error('R2 tamaño/formato')
    let update = auth.supabase
      .from('clases')
      .update({ video_key: state.key, vimeo_url: null })
      .eq('id', state.claseId)
    update =
      state.anterior === null
        ? update.is('video_key', null)
        : update.eq('video_key', state.anterior)
    const saved = await update.select('id').maybeSingle()
    if (saved.error || !saved.data) throw new Error('R2 vincular')
    console.info('admin_video_uploaded', {
      adminId: auth.user.id,
      claseId: state.claseId,
      bytes: state.bytes,
    })
    return NextResponse.json({ ok: true })
  } catch {
    console.error('admin_video_upload_failed')
    return NextResponse.json(
      {
        error:
          'No pudimos terminar la carga. Reintentá; la clase anterior no se modifica.',
      },
      { status: 502 },
    )
  }
}
