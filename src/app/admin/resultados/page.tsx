import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ResultadosAdmin from './ResultadosAdmin'
import { FILTRO_CUENTAS_PRUEBA } from '@/lib/test-accounts'

export default async function ResultadosAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
  if (perfil?.rol !== 'admin') redirect('/inicio')

  const { data: resultados, error: errorResultados } = await supabase
    .from('resultados')
    .select('*, perfiles(nombre, avatar_url)')
    .not('alumna_id', 'in', FILTRO_CUENTAS_PRUEBA)
    .order('created_at', { ascending: false })

  const [{ data: socias, error: errorSocias }, { data: accesos, error: errorAccesos }] = await Promise.all([
    supabase.from('perfiles').select('id,nombre,estado').neq('rol','admin').not('id', 'in', FILTRO_CUENTAS_PRUEBA).or('tipo_usuario.eq.socia,rol.in.(afiliada,afiliada_lanzamiento)').order('nombre'),
    supabase.from('accesos_resultados').select('usuaria_id,habilitada'),
  ])
  const cuentas = (socias ?? []).map(s => ({ ...s, habilitada: (accesos ?? []).some(a => a.usuaria_id === s.id && a.habilitada) }))
  const lista = (resultados ?? []).map(r => ({ ...r, archivo_url: r.archivo_url ? 'privada' : null }))
  return <ResultadosAdmin resultados={lista} socias={cuentas} errorCarga={Boolean(errorResultados || errorSocias || errorAccesos)} />
}
