import { idComunidadValido, validarFelicitacion } from '@/lib/community'
import { felicitarPublicacionComunidad, ErrorComunidad } from '@/lib/community-server'
import { ejecutarComunidad, leerJsonComunidad, respuestaComunidad, sinParametrosComunidad, validarEntradaComunidad } from '@/lib/community-http'

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  return ejecutarComunidad(request, true, async auth => {
    sinParametrosComunidad(request)
    const { id } = await context.params
    if (!idComunidadValido(id)) throw new ErrorComunidad(400, 'La publicación solicitada no es válida.')
    const body = await leerJsonComunidad(request)
    const activo = validarEntradaComunidad(() => validarFelicitacion(body))
    return respuestaComunidad({ ok: true, ...await felicitarPublicacionComunidad(auth, id.toLowerCase(), activo) })
  })
}
