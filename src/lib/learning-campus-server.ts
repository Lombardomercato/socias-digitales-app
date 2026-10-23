import 'server-only'
import type { createClient } from './supabase/server'
import { puedeVerClasesPrivadas, type PerfilClases } from './class-access'
import { leerCatalogoClases } from './class-catalog'
import { leerProgresoClases } from './class-progress-server'
import { resumirCampusAprendizaje, type ResumenCampus } from './learning-campus'

// El llamador verifica getUser y obtiene este perfil protegido de esa misma
// sesión. No pasar un ID elegido por el navegador ni usar un cliente privilegiado
// para el progreso; se conserva el lector y la RLS propios de la biblioteca.
export async function leerCampusAprendizaje(supabase: Awaited<ReturnType<typeof createClient>>, usuariaId: string, perfil: PerfilClases): Promise<ResumenCampus> {
  if (!usuariaId || perfil?.rol === 'admin' || !puedeVerClasesPrivadas(perfil)) return resumirCampusAprendizaje(null, null)
  const [catalogo, progreso] = await Promise.allSettled([
    leerCatalogoClases(perfil),
    leerProgresoClases(supabase, usuariaId),
  ])
  if (catalogo.status === 'rejected') {
    console.error('learning_campus_catalog_read_failed')
    return resumirCampusAprendizaje(null, null)
  }
  if (progreso.status === 'rejected') console.error('learning_campus_progress_read_failed')
  return resumirCampusAprendizaje(catalogo.value, progreso.status === 'fulfilled' ? progreso.value : null)
}
