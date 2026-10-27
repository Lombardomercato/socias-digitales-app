import { idCrmValido, validarEventoCrm } from '@/lib/resource-crm'
import { ejecutarCrm, ErrorRecursosCrm, leerJsonCrm, registrarEventoCrm, responderCrm, validarEntradaCrm } from '@/lib/resource-crm-server'
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { return ejecutarCrm(request, true, async auth => {
  const { id } = await context.params
  if (!idCrmValido(id) || new URL(request.url).search) throw new ErrorRecursosCrm(400, 'Contacto no válido.')
  const raw = await leerJsonCrm(request), entrada = validarEntradaCrm(() => validarEventoCrm(raw))
  return responderCrm({ ok: true, evento: await registrarEventoCrm(auth, id.toLowerCase(), entrada) })
}) }
