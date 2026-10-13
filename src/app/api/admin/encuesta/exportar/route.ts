import { NextResponse } from 'next/server'
import { permisoEncuesta, leerEncuesta } from '@/lib/survey-server'
import { construirEncuesta, fechaEncuestaArgentina, validarFiltrosEncuesta, filtrarEncuesta, csvEncuesta } from '@/lib/survey'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }
export async function GET(request: Request) {
  const { supabase, status } = await permisoEncuesta()
  if (status !== 200) return NextResponse.json({ error: status === 503 ? 'No pudimos comprobar el acceso.' : 'Ingresá con una cuenta administradora.' }, { status, headers })
  let filtros
  try { filtros = validarFiltrosEncuesta(new URL(request.url).searchParams) }
  catch { return NextResponse.json({ error: 'Revisá los filtros de la encuesta.' }, { status: 400, headers }) }
  try {
    const { perfiles, bienvenida } = await leerEncuesta(supabase)
    const hoy = fechaEncuestaArgentina()
    const rows = filtrarEncuesta(construirEncuesta(perfiles, bienvenida, hoy), filtros)
    return new NextResponse(csvEncuesta(perfiles, rows), { headers: { ...headers, 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="encuesta-socias-${hoy}.csv"` } })
  } catch { return NextResponse.json({ error: 'No pudimos exportar todas las respuestas. Intentá nuevamente.' }, { status: 503, headers }) }
}
