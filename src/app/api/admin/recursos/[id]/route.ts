import { idCrmValido, validarRecursoCrm } from '@/lib/resource-crm'
import { ejecutarCrm, ErrorRecursosCrm, guardarRecursoCrm, leerJsonCrm, responderCrm, validarEntradaCrm } from '@/lib/resource-crm-server'
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) { return ejecutarCrm(request, true, async auth => {
  const { id } = await context.params
  if (!idCrmValido(id) || new URL(request.url).search) throw new ErrorRecursosCrm(400, 'Recurso no válido.')
  const raw = await leerJsonCrm(request), entrada = validarEntradaCrm(() => validarRecursoCrm(raw, true))
  if (entrada.id !== id.toLowerCase()) throw new ErrorRecursosCrm(400, 'La identidad del recurso no coincide.')
  return responderCrm({ ok: true, recurso: await guardarRecursoCrm(auth, entrada, true) })
}) }
