import { ejecutarComunidad, respuestaComunidad, sinParametrosComunidad } from '@/lib/community-http'
import { subirFotoComunidad, obtenerFotoComunidad, ErrorFotosComunidad } from '@/lib/community-photos-server'
import { ErrorComunidad } from '@/lib/community-server'
export const runtime = 'nodejs'
export const maxDuration = 60
type Contexto = { params: Promise<{ id: string; fotoId: string }> }
export async function PUT(request: Request, context: Contexto) {
  return ejecutarComunidad(request, true, async auth => {
    try { sinParametrosComunidad(request); const { id, fotoId } = await context.params; return respuestaComunidad({ foto: await subirFotoComunidad(auth, id.toLowerCase(), fotoId.toLowerCase(), request) }) }
    catch (error) { if (error instanceof ErrorFotosComunidad) throw new ErrorComunidad(error.status, error.message); throw error }
  })
}
export async function GET(request: Request, context: Contexto) {
  return ejecutarComunidad(request, false, async auth => {
    try { sinParametrosComunidad(request); const { id, fotoId } = await context.params; return await obtenerFotoComunidad(auth, id.toLowerCase(), fotoId.toLowerCase()) }
    catch (error) { if (error instanceof ErrorFotosComunidad) throw new ErrorComunidad(error.status, error.message); throw error }
  })
}
