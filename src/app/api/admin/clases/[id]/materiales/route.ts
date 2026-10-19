import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { autorizarAdmin } from '@/lib/admin-auth'
import { esUuid } from '@/lib/class-management'
import { archivoMaterial, claveMaterial, enlaceMaterial, moverMaterial, tituloMaterial, MAX_HISTORIAL_MATERIALES, MAX_MATERIALES, type MaterialClase } from '@/lib/class-materials'
import { ConflictoMateriales, guardarMateriales, leerMateriales, revisionMateriales } from '@/lib/class-materials-store'
import { consolidarArchivo, leerTicketMaterial, ticketMaterial } from '@/lib/class-materials-upload'
import { firmarCargaMaterial } from '@/lib/r2-upload'

const headers = { 'Cache-Control': 'private, no-store' }
type Context = { params: Promise<{ id: string }> }
export async function GET(_request: Request, context: Context) {
  const auth = await autorizarAdmin()
  if (auth.error) return auth.error
  const { id } = await context.params
  if (!esUuid(id)) return NextResponse.json({ error: 'Clase no válida.' }, { status: 404, headers })
  const clase = await auth.supabase.from('clases').select('id').eq('id', id).maybeSingle()
  if (clase.error || !clase.data) return NextResponse.json({ error: 'No pudimos cargar la clase.' }, { status: 404, headers })
  try { return NextResponse.json(await leerMateriales(id), { headers }) }
  catch {
    console.error('admin_class_materials_read_failed')
    return NextResponse.json({ error: 'No pudimos cargar los materiales. Reintentá antes de editar.' }, { status: 503, headers })
  }
}
export async function POST(request: Request, context: Context) {
  const auth = await autorizarAdmin(request)
  if (auth.error) return auth.error
  const { id } = await context.params
  if (!esUuid(id)) return NextResponse.json({ error: 'Clase no válida.' }, { status: 404, headers })
  try {
    const text = await request.text()
    if (text.length > 12_000) return NextResponse.json({ error: 'Solicitud demasiado grande.' }, { status: 413, headers })
    const input = JSON.parse(text)
    if (!input || typeof input !== 'object') throw new Error('Solicitud no válida.')
    const keys: Record<string, string[]> = {
      preparar: ['titulo', 'nombre', 'bytes'], finalizar: ['ticket'], enlace: ['titulo', 'url'],
      editar: ['materialId', 'titulo', 'url'], retirar: ['materialId'], restaurar: ['materialId'], mover: ['materialId', 'direccion'],
    }
    if (!Object.hasOwn(keys, input.action) || Object.keys(input).some(k => !['action', 'revision', ...keys[input.action]].includes(k))) throw new Error('Solicitud no válida.')
    const revision = revisionMateriales(input.revision)
    const clase = await auth.supabase.from('clases').select('id').eq('id', id).maybeSingle()
    if (clase.error) return NextResponse.json({ error: 'No pudimos verificar la clase.' }, { status: 503, headers })
    if (!clase.data) return NextResponse.json({ error: 'Guardá la ficha antes de agregar materiales.' }, { status: 404, headers })
    const actual = await leerMateriales(id)
    // El reintento de una carga ya confirmada no duplica ni restaura el material.
    const ticket = input.action === 'finalizar' ? leerTicketMaterial(input.ticket, auth.user.id, id) : null
    if (ticket && actual.materiales.some(m => m.id === ticket.id)) return NextResponse.json(actual, { headers })
    if (actual.revision !== revision) throw new ConflictoMateriales('Otra administradora cambió los materiales. Recargá la lista; tu formulario se conserva.')
    let lista = [...actual.materiales]
    const agrega = ['preparar', 'finalizar', 'enlace'].includes(input.action)
    if (agrega && (lista.filter(m => m.activo).length >= MAX_MATERIALES || lista.length >= MAX_HISTORIAL_MATERIALES)) throw new Error('Se alcanzó el límite de materiales. Retirá alguno o consultá al equipo.')
    if (input.action === 'preparar') {
      const archivo = archivoMaterial(input.nombre, input.bytes), titulo = tituloMaterial(input.titulo), materialId = randomUUID()
      return NextResponse.json({ ticket: ticketMaterial({ user: auth.user.id, clase: id, id: materialId, titulo, archivo, exp: Date.now() + 30 * 60_000 }), url: firmarCargaMaterial(claveMaterial(id, materialId, archivo.extension, true), archivo.mime), mime: archivo.mime }, { headers })
    }
    if (ticket) {
      await consolidarArchivo(id, ticket.id, ticket.archivo)
      lista.push({ id: ticket.id, titulo: ticket.titulo, tipo: 'archivo', archivo: ticket.archivo, activo: true, creado: new Date().toISOString() })
    } else if (input.action === 'enlace') {
      lista.push({ id: randomUUID(), titulo: tituloMaterial(input.titulo), tipo: 'enlace', url: enlaceMaterial(input.url), activo: true, creado: new Date().toISOString() })
    } else if (input.action === 'mover') {
      lista = moverMaterial(lista, input.materialId, input.direccion)
    } else {
      if (!esUuid(input.materialId)) throw new Error('Material no válido.')
      const index = lista.findIndex(m => m.id === input.materialId)
      if (index < 0) return NextResponse.json({ error: 'Material no encontrado.' }, { status: 404, headers })
      const material = lista[index]
      if (input.action === 'editar') lista[index] = { ...material, titulo: tituloMaterial(input.titulo), ...(material.tipo === 'enlace' ? { url: enlaceMaterial(input.url) } : {}) } as MaterialClase
      else lista[index] = { ...material, activo: input.action === 'restaurar' }
    }
    return NextResponse.json(await guardarMateriales(id, lista, revision, auth.user.id), { headers })
  } catch (error) {
    if (error instanceof ConflictoMateriales) return NextResponse.json({ error: error.message }, { status: 409, headers })
    console.error('admin_class_materials_save_failed', { kind: error instanceof SyntaxError ? 'invalid_json' : 'request_or_storage' })
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No pudimos guardar el material.' }, { status: 400, headers })
  }
}
