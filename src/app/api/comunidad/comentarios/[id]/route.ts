import { idComunidadValido, validarCambioComunidad } from '@/lib/community'
import { cambiarComentarioComunidad, ErrorComunidad } from '@/lib/community-server'
import { ejecutarComunidad, leerJsonComunidad, respuestaComunidad, sinParametrosComunidad, validarEntradaComunidad } from '@/lib/community-http'

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return ejecutarComunidad(request, true, async auth => {
    sinParametrosComunidad(request)
    const { id } = await context.params
    if (!idComunidadValido(id)) throw new ErrorComunidad(400, 'El comentario solicitado no es válido.')
    const body = await leerJsonComunidad(request)
    const cambio = validarEntradaComunidad(() => validarCambioComunidad(body, true))
    return respuestaComunidad({ ok: true, comentario: await cambiarComentarioComunidad(auth, id.toLowerCase(), cambio) })
  })
}
