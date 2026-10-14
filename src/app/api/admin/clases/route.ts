import { NextResponse } from 'next/server'
import { autorizarAdmin } from '@/lib/admin-auth'
import { datosClase, esUuid } from '@/lib/class-management'

export async function POST(request: Request) {
  const auth = await autorizarAdmin(request)
  if (auth.error) return auth.error
  try {
    const input = await request.json()
    if (input.action === 'renombrar') {
      const anterior =
        typeof input.anterior === 'string' ? input.anterior.trim() : ''
      const nuevo =
        typeof input.nuevo === 'string'
          ? input.nuevo.trim().replace(/\s+/g, ' ')
          : ''
      if (!anterior || !nuevo || anterior.length > 100 || nuevo.length > 100)
        return NextResponse.json(
          { error: 'Revisá el nombre del programa.' },
          { status: 400 },
        )
      const { error } = await auth.supabase
        .from('clases')
        .update({ modulo: nuevo })
        .eq('modulo', anterior)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }
    const datos = datosClase(input)
    if (!datos || (input.id && !esUuid(input.id)))
      return NextResponse.json(
        { error: 'Revisá título, programa, orden y enlace de Vimeo.' },
        { status: 400 },
      )
    let key: string | null = null
    if (input.id) {
      const { data, error } = await auth.supabase
        .from('clases')
        .select('video_key')
        .eq('id', input.id)
        .maybeSingle()
      if (error) throw error
      if (!data)
        return NextResponse.json(
          { error: 'Clase no encontrada.' },
          { status: 404 },
        )
      key = data.video_key
    }
    if (datos.activo && !key && !datos.vimeo_url)
      return NextResponse.json(
        { error: 'Cargá el video antes de publicar la clase.' },
        { status: 400 },
      )
    const result = input.id
      ? await auth.supabase
          .from('clases')
          .update(datos)
          .eq('id', input.id)
          .select('id')
          .single()
      : await auth.supabase
          .from('clases')
          .insert({ ...datos, plan: '27' })
          .select('id')
          .single()
    if (result.error) throw result.error
    return NextResponse.json({ ok: true, id: result.data.id })
  } catch (error) {
    console.error('admin_class_save_failed', {
      code: (error as { code?: string })?.code,
    })
    return NextResponse.json(
      { error: 'No pudimos guardar la clase. Intentá nuevamente.' },
      { status: 500 },
    )
  }
}
