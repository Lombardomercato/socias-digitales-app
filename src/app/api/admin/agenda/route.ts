import { NextResponse } from 'next/server'
import { autorizarAdmin } from '@/lib/admin-auth'
import { validarHito } from '@/lib/agenda-management'
import { ConflictoAgenda, guardarAgenda, leerAgenda } from '@/lib/agenda-store'

const headers = { 'Cache-Control': 'private, no-store' }
export async function GET() {
  const auth = await autorizarAdmin()
  if (auth.error) return auth.error
  try { return NextResponse.json(await leerAgenda(), { headers }) }
  catch { return NextResponse.json({ error: 'No pudimos cargar la agenda. Volvé a intentar.' }, { status: 503, headers }) }
}
export async function PUT(request: Request) {
  try {
    const auth = await autorizarAdmin(request)
    if (auth.error) return auth.error
    const raw = await request.text()
    if (raw.length > 12_000) return NextResponse.json({ error: 'El encuentro es demasiado largo.' }, { status: 413 })
    let x, hito
    try {
      x = JSON.parse(raw)
      if (!x || Object.keys(x).some(k => !['hito', 'revision'].includes(k)) ||
          (x.revision !== null && typeof x.revision !== 'string')) throw new Error('Recargá y revisá el encuentro.')
      hito = validarHito(x.hito)
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Revisá el encuentro.' }, { status: 400 })
    }
    return NextResponse.json(await guardarAgenda(hito, x.revision, auth.user.id), { headers })
  } catch (error) {
    return NextResponse.json({ error: error instanceof ConflictoAgenda ? error.message : 'No pudimos guardar. Recargá la agenda para comprobar el estado antes de reintentar.' }, { status: error instanceof ConflictoAgenda ? 409 : 503, headers })
  }
}
