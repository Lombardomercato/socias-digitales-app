import { idCrmValido, validarCursorCrm, validarSegmentoCrm } from '@/lib/resource-crm'
import { ejecutarCrm, ErrorRecursosCrm, leerHistorialCrm, leerJsonCrm, responderCrm, segmentarContactoCrm, validarEntradaCrm } from '@/lib/resource-crm-server'
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) { return ejecutarCrm(request, false, async auth => {
  const { id } = await context.params, params = new URL(request.url).searchParams
  if (!idCrmValido(id) || [...params.keys()].some(k => k !== 'cursor') || params.getAll('cursor').length > 1) throw new ErrorRecursosCrm(400, 'Contacto no válido.')
  const cursor = params.get('cursor') ?? undefined; validarEntradaCrm(() => validarCursorCrm(cursor))
  const data = await leerHistorialCrm(auth, id.toLowerCase(), cursor); return responderCrm(data, data.estado === 'error' ? 503 : 200)
}) }
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) { return ejecutarCrm(request, true, async auth => {
  const { id } = await context.params
  if (!idCrmValido(id) || new URL(request.url).search) throw new ErrorRecursosCrm(400, 'Contacto no válido.')
  const raw = await leerJsonCrm(request), entrada = validarEntradaCrm(() => validarSegmentoCrm(raw))
  return responderCrm({ ok: true, contacto: await segmentarContactoCrm(auth, id.toLowerCase(), entrada) })
}) }
