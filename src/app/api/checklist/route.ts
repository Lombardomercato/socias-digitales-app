import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { permisoMiDia } from '@/lib/my-day-server'
import { mismaTarea, validarTarea } from '@/lib/my-day'
import { origenMetricasPermitido } from '@/lib/metrics'
const headers = { 'Cache-Control': 'private, no-store' }
const responder = (body: object, status = 200) => NextResponse.json(body, { status, headers })
export async function POST(req: NextRequest) { return guardar(req, 'crear') }
export async function PATCH(req: NextRequest) { return guardar(req, 'editar') }
async function guardar(req: NextRequest, modo: 'crear' | 'editar') {
  try {
    if (!origenMetricasPermitido(req.headers.get('origin'), req.nextUrl.origin, req.headers.get('host'))) return responder({ error: 'Origen no permitido.' }, 403)
    if (Number(req.headers.get('content-length') ?? 0) > 5000) return responder({ error: 'La tarea es demasiado grande.' }, 413)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return responder({ error: 'Iniciá sesión.' }, 401)
    const acceso = await permisoMiDia(supabase, user.id)
    if (acceso.error) return responder({ error: 'No pudimos comprobar tu acceso.' }, 503)
    if (!acceso.permitido) return responder({ error: 'Flor todavía no habilitó Mi día para tu cuenta.' }, 403)
    let entrada: ReturnType<typeof validarTarea>
    try { entrada = validarTarea(await req.json(), modo) } catch (causa) { return responder({ error: causa instanceof Error ? causa.message : 'Revisá la tarea.' }, 400) }
    const { id, version, datos } = entrada
    const leer = () => supabase.from('checklist_tareas').select('*').eq('id', id).eq('alumna_id', user.id).maybeSingle()
    const { data: existente, error: consulta } = await leer()
    if (consulta) return responder({ error: 'No pudimos comprobar la tarea. Tus cambios se conservan.' }, 503)
    if (modo === 'crear' && existente) return mismaTarea(existente, datos) ? responder({ ok: true, tarea: existente }) : responder({ error: 'Este envío ya fue guardado con otros datos.' }, 409)
    if (modo === 'editar') {
      if (!existente) return responder({ error: 'Tarea no disponible.' }, 404)
      if (existente.version === Number(version) + 1 && mismaTarea(existente, datos)) return responder({ ok: true, tarea: existente })
      if (existente.version !== version) return responder({ error: 'La tarea cambió en otra pestaña. Volvé a abrir la versión guardada antes de editarla.' }, 409)
    }
    const query = modo === 'crear' ? supabase.from('checklist_tareas').insert({ ...datos, id, alumna_id: user.id }) : supabase.from('checklist_tareas').update(datos).eq('id', id).eq('alumna_id', user.id).eq('version', version!)
    const { data: tarea, error } = await query.select('*').maybeSingle()
    if (!error && tarea) return responder({ ok: true, tarea })
    const { data: confirmada, error: confirmacion } = await leer()
    if (!confirmacion && confirmada && mismaTarea(confirmada, datos) && (modo === 'crear' || confirmada.version === Number(version) + 1)) return responder({ ok: true, tarea: confirmada })
    if (!error && modo === 'editar') return responder({ error: 'La tarea cambió. Volvé a abrir la versión guardada.' }, 409)
    return responder({ error: 'No pudimos guardar. Tus cambios se conservan; podés reintentar.' }, 503)
  } catch { return responder({ error: 'No pudimos conectarnos. Tus cambios se conservan; podés reintentar.' }, 503) }
}
