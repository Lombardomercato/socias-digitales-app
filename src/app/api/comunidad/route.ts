import { validarFiltrosComunidad, validarNuevaPublicacion } from '@/lib/community'
import { crearPublicacionComunidad, leerComunidad, ErrorComunidad } from '@/lib/community-server'
import { ejecutarComunidad, leerJsonComunidad, respuestaComunidad, sinParametrosComunidad, validarEntradaComunidad } from '@/lib/community-http'

export async function GET(request: Request) {
  return ejecutarComunidad(request, false, async auth => {
    const filtros = validarEntradaComunidad(() => validarFiltrosComunidad(new URL(request.url).searchParams))
    if (!auth.admin && ['ocultas', 'retiradas'].includes(filtros.vista)) throw new ErrorComunidad(403, 'Esta vista está reservada a la administración.')
    const pagina = await leerComunidad(auth, filtros)
    return respuestaComunidad(pagina, pagina.estado === 'error' ? 503 : 200)
  })
}
export async function POST(request: Request) {
  return ejecutarComunidad(request, true, async auth => {
    sinParametrosComunidad(request)
    const body = await leerJsonComunidad(request)
    const entrada = validarEntradaComunidad(() => validarNuevaPublicacion(body))
    return respuestaComunidad({ ok: true, publicacion: await crearPublicacionComunidad(auth, entrada) })
  })
}
