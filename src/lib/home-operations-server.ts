import 'server-only'
import type { createClient } from './supabase/server'
import { leerMiDia } from './my-day-server'
import { fechaDiaValida } from './my-day'
import { resumirMiDiaInicio, type ResumenMiDiaInicio } from './home-operations'

// El llamador ya verificó getUser y permisoMiDia para esta misma usuaria.
// No aceptar un uid o permiso elegido desde el navegador, ni compartir caché.
export async function leerResumenMiDiaInicio(supabase: Awaited<ReturnType<typeof createClient>>, uid: string, fecha: string, permiso: { permitido: boolean; error?: boolean }): Promise<ResumenMiDiaInicio> {
  if (!permiso || typeof permiso.permitido !== 'boolean' || (permiso.error !== undefined && typeof permiso.error !== 'boolean') || permiso.error === true) return { estado: 'error' }
  if (!permiso.permitido) return { estado: 'no-habilitado' }
  if (!uid || !fechaDiaValida(fecha)) return { estado: 'error' }
  try {
    return resumirMiDiaInicio(await leerMiDia(supabase, uid, fecha), uid, fecha)
  } catch {
    console.error('home_my_day_read_failed')
    return { estado: 'error' }
  }
}
