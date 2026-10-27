import 'server-only'
import { unstable_rethrow } from 'next/navigation'
import type { createClient } from './supabase/server'
import type { HitoAgenda } from './agenda'
import { proyectarEncuentrosCalendario, resolverMesCalendario, resumirTareasCalendario, type CalendarioPersonal, type TareasCalendario } from './home-calendar'

export interface PermisoCalendario { permitido: boolean; admin?: boolean; error?: boolean }

// Inicio ya verificó getUser, perfil, permiso propio y audiencia de estos hitos.
// No aceptar identidad/permisos del navegador, no consultar Auth/R2 otra vez.
export async function leerCalendarioPersonal(
  supabase: Awaited<ReturnType<typeof createClient>>, usuariaId: string, perfil: { rol?: string },
  permiso: PermisoCalendario, mes: unknown, hoy: string, hitos: readonly HitoAgenda[], errorAgenda: boolean,
): Promise<CalendarioPersonal> {
  if (!usuariaId || !perfil || !perfil.rol || perfil.rol === 'admin' || permiso?.admin === true) return { estado: 'error' }
  try {
    const rango = resolverMesCalendario(mes, hoy)
    const encuentros = proyectarEncuentrosCalendario(hitos, rango, errorAgenda)
    let tareas: TareasCalendario
    if (!permiso || typeof permiso.permitido !== 'boolean' || (permiso.error !== undefined && typeof permiso.error !== 'boolean') || permiso.error === true) tareas = { estado: 'error' }
    else if (!permiso.permitido) tareas = { estado: 'no-habilitado' }
    else {
      const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 5_000)
      try {
        // Máximo 31 días: respeta el límite existente de resumen_mi_dia.
        const resultado = await supabase.rpc('resumen_mi_dia', { desde: rango.desde, hasta: rango.hasta }).abortSignal(controller.signal)
        tareas = resumirTareasCalendario(resultado.data, usuariaId, rango, Boolean(resultado.error))
      } catch (error) { unstable_rethrow(error); tareas = { estado: 'error' } }
      finally { clearTimeout(timeout) }
    }
    return { estado: 'listo', rango, hoy, tareas, encuentros }
  } catch (error) {
    unstable_rethrow(error)
    return { estado: 'error' }
  }
}
