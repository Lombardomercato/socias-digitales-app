import { idComunidadValido, validarFiltroComentarios, validarNuevoComentario } from '@/lib/community'
import { crearComentarioComunidad, leerComentariosComunidad, ErrorComunidad } from '@/lib/community-server'
import { ejecutarComunidad, leerJsonComunidad, respuestaComunidad, sinParametrosComunidad, validarEntradaComunidad } from '@/lib/community-http'

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return ejecutarComunidad(request, false, async auth => {
    const { id } = await context.params
    if (!idComunidadValido(id)) throw new ErrorComunidad(400, 'La publicación solicitada no es válida.')
    const cursor = validarEntradaComunidad(() => validarFiltroComentarios(new URL(request.url).searchParams))
    const pagina = await leerComentariosComunidad(auth, id.toLowerCase(), cursor)
    return respuestaComunidad(pagina, pagina.estado === 'error' ? 503 : 200)
  })
}
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return ejecutarComunidad(request, true, async auth => {
    sinParametrosComunidad(request)
    const { id } = await context.params
    if (!idComunidadValido(id)) throw new ErrorComunidad(400, 'La publicación solicitada no es válida.')
    const body = await leerJsonComunidad(request)
    const entrada = validarEntradaComunidad(() => validarNuevoComentario(body))
    return respuestaComunidad({ ok: true, comentario: await crearComentarioComunidad(auth, id.toLowerCase(), entrada) })
  })
}
