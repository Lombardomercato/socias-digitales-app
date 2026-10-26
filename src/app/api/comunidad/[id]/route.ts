import { idComunidadValido, validarCambioComunidad } from '@/lib/community'
import { cambiarPublicacionComunidad, ErrorComunidad } from '@/lib/community-server'
import { ejecutarComunidad, leerJsonComunidad, respuestaComunidad, sinParametrosComunidad, validarEntradaComunidad } from '@/lib/community-http'

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return ejecutarComunidad(request, true, async auth => {
    sinParametrosComunidad(request)
    const { id } = await context.params
    if (!idComunidadValido(id)) throw new ErrorComunidad(400, 'La publicación solicitada no es válida.')
    const body = await leerJsonComunidad(request)
    const cambio = validarEntradaComunidad(() => validarCambioComunidad(body))
    return respuestaComunidad({ ok: true, publicacion: await cambiarPublicacionComunidad(auth, id.toLowerCase(), cambio) })
  })
}
