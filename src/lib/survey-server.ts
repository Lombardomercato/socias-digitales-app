import 'server-only'
import { createClient } from './supabase/server'
import type { SurveyProfile, SurveyWelcome } from './survey'
import { FILTRO_CUENTAS_PRUEBA } from './test-accounts'

export async function permisoEncuesta() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { supabase, status: 401 }
  const { data: perfil, error } = await supabase.from('perfiles').select('rol').eq('id', user.id).maybeSingle()
  return { supabase, status: error ? 503 : perfil?.rol === 'admin' ? 200 : 403 }
}
export async function leerEncuesta(supabase: Awaited<ReturnType<typeof createClient>>) {
  // Paginación explícita: no convertir el límite de la API en un total falso.
  const perfiles: SurveyProfile[] = [], bienvenida: SurveyWelcome[] = []
  const campos = 'id,nombre,rol,tipo_usuario,estado,created_at,whatsapp,fecha_nacimiento,ocupacion,titulo_profesional,es_mama,ingresos_actuales,pais,provincia,avatar_url'
  for (let offset = 0; offset < 10000; offset += 1000) {
    const [p, b] = await Promise.all([
      supabase.from('perfiles').select(campos).neq('rol', 'admin').not('id', 'in', FILTRO_CUENTAS_PRUEBA).order('id').range(offset, offset + 999),
      supabase.from('bienvenida_perfiles').select('usuaria_id,completado_at,actualizado_at,exenta,respondidas').not('usuaria_id', 'in', FILTRO_CUENTAS_PRUEBA).order('usuaria_id').range(offset, offset + 999),
    ])
    if (p.error || b.error || !p.data || !b.data) throw new Error('No pudimos leer todas las respuestas.')
    perfiles.push(...p.data as SurveyProfile[]); bienvenida.push(...b.data as SurveyWelcome[])
    if (p.data.length < 1000 && b.data.length < 1000) return { perfiles, bienvenida }
  }
  throw new Error('La encuesta supera el tamaño de esta vista. No se muestran cifras parciales.')
}
