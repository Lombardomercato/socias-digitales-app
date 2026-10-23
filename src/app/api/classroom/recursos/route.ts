import { NextResponse } from 'next/server'
import { autorizarBibliotecaRecursos } from '@/lib/resource-library-access'
import { leerBibliotecaRecursos } from '@/lib/resource-library-server'

export const maxDuration = 120
const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' }

export async function GET(request: Request) {
  const auth = await autorizarBibliotecaRecursos()
  if ('error' in auth) return NextResponse.json({ estado: 'error', mensaje: auth.error.mensaje }, { status: auth.error.status, headers })
  const params = new URL(request.url).searchParams
  const rawOffset = params.get('offset') ?? '0'
  const revision = params.get('revision') ?? undefined
  if ([...params.keys()].some(key => !['offset', 'revision'].includes(key)) || params.getAll('offset').length > 1 || params.getAll('revision').length > 1
    || !/^(0|[1-9]\d{0,5})$/.test(rawOffset) || (revision !== undefined && !/^[a-f0-9]{64}$/.test(revision))) {
    return NextResponse.json({ estado: 'error', mensaje: 'Revisá los parámetros de la biblioteca.' }, { status: 400, headers })
  }
  try {
    const pagina = await leerBibliotecaRecursos(auth.perfil, Number(rawOffset), revision)
    return NextResponse.json(pagina, { status: pagina.estado === 'error' ? 503 : 200, headers })
  } catch {
    console.error('resource_library_request_failed')
    return NextResponse.json({ estado: 'error', mensaje: 'No pudimos cargar tus materiales. Volvé a intentar.' }, { status: 503, headers })
  }
}
