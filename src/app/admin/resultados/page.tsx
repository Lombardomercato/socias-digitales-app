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

  const { data: resultados, error: errorResultados, count: totalResultados } = await supabase
    .from('resultados')
    .select('*, perfiles(nombre, avatar_url)', { count: 'exact' })
    .not('alumna_id', 'in', FILTRO_CUENTAS_PRUEBA)
    .order('created_at', { ascending: false })
    .limit(1000)

  const [{ data: socias, error: errorSocias }, { data: accesos, error: errorAccesos }] = await Promise.all([
    supabase.from('perfiles').select('id,nombre,estado').neq('rol','admin').not('id', 'in', FILTRO_CUENTAS_PRUEBA).or('tipo_usuario.eq.socia,rol.in.(afiliada,afiliada_lanzamiento)').order('nombre'),
    supabase.from('accesos_resultados').select('usuaria_id,habilitada'),
  ])
  const cuentas = (socias ?? []).map(s => ({ ...s, habilitada: (accesos ?? []).some(a => a.usuaria_id === s.id && a.habilitada) }))
  const lista = (resultados ?? []).map(r => ({ ...r, archivo_url: r.archivo_url ? 'privada' : null }))
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit' }).formatToParts(new Date())
  const periodoActual = `${partes.find(p => p.type === 'year')?.value}-${partes.find(p => p.type === 'month')?.value}`
  return <ResultadosAdmin resultados={lista} socias={cuentas} periodoActual={periodoActual} errorCarga={Boolean(errorResultados || errorSocias || errorAccesos || totalResultados === null || (totalResultados ?? 0) > lista.length)} />
}
