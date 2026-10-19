import { NextResponse } from 'next/server'
import { autorizarMateriales, HEADERS_MATERIALES } from '@/lib/class-materials-access'
import { leerMateriales } from '@/lib/class-materials-store'
import { materialesVisibles } from '@/lib/class-materials'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const auth = await autorizarMateriales(id)
  if ('error' in auth) return auth.error
  try {
    const lista = await leerMateriales(id)
    return NextResponse.json({ materiales: materialesVisibles(id, lista.materiales) }, { headers: HEADERS_MATERIALES })
  } catch {
    console.error('class_materials_read_failed')
    return NextResponse.json({ error: 'No pudimos cargar los materiales. Podés seguir viendo la clase.' }, { status: 503, headers: HEADERS_MATERIALES })
  }
}
