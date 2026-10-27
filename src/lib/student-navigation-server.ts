import 'server-only'
import { unstable_rethrow } from 'next/navigation'
import { createClient } from './supabase/server'
import { accesoInicio } from './home-access'
import { puedeUsarComunidad } from './community'
import { puedeVerLogros } from './achievements'
import { permisoResultados } from './results-server'
import { permisoMetricas } from './metrics-server'
import { permisoMiDia } from './my-day-server'
import { leerAvisosSinLeer, type ResumenAvisos } from './unread-notices'
import { leerAgenda } from './agenda-store'
import { hitoParaAlumna } from './agenda-management'
import type { StudentNavigationData } from './student-navigation'

// Presentación de la sesión propia, nunca una autorización de las páginas/API.
// Sin caché compartida entre cuentas ni cliente privilegiado.
export async function leerNavegacionAlumna(): Promise<StudentNavigationData | null> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: errorSesion } = await supabase.auth.getUser()
    if (errorSesion || !user) return null
    const { data: perfil, error } = await supabase.from('perfiles')
      .select('id,nombre,rol,tipo_usuario,estado,desafio_socias_habilitada').eq('id', user.id).maybeSingle()
    if (error || !perfil || perfil.id !== user.id || perfil.rol === 'admin' || !accesoInicio(perfil).formacion) return null

    const permiso = async (lectura: () => Promise<{ permitido: boolean; error?: boolean; admin?: boolean }>) => {
      try { const acceso = await lectura(); return acceso.permitido === true && !acceso.error && !acceso.admin }
      catch (cause) { unstable_rethrow(cause); return false }
    }
    const avisos = async (): Promise<ResumenAvisos> => {
      try { return await leerAvisosSinLeer(supabase, user.id) }
      catch (cause) { unstable_rethrow(cause); return { cantidad: 0, ultimoTitulo: null, errorCarga: true } }
    }
    const agenda = async () => {
      try { return { hitos: hitoParaAlumna((await leerAgenda()).hito, perfil), errorAgenda: false } }
      catch (cause) { unstable_rethrow(cause); return { hitos: [], errorAgenda: true } }
    }
    const [resultados, metricas, miDia, resumen, encuentro] = await Promise.all([
      permiso(() => permisoResultados(supabase, user.id)), permiso(() => permisoMetricas(supabase, user.id)),
      permiso(() => permisoMiDia(supabase, user.id)), avisos(), agenda(),
    ])
    return {
      nombre: typeof perfil.nombre === 'string' && perfil.nombre.trim() ? perfil.nombre.trim().split(/\s+/)[0] : 'Socia',
      formacion: true, comunidad: puedeUsarComunidad(perfil),
      herramientas: { resultados, metricas, miDia, logros: puedeVerLogros(perfil) },
      ahoraInicial: Date.now(), avisos: resumen, ...encuentro,
    }
  } catch (cause) { unstable_rethrow(cause); return null }
}
