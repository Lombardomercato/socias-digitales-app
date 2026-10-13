import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fechaArgentina } from '@/lib/metrics'
import { fechaDiaValida, type ResumenDia } from '@/lib/my-day'
import MiDiaAdmin from './MiDiaAdmin'
import { FILTRO_CUENTAS_PRUEBA, esCuentaPrueba } from '@/lib/test-accounts'

export default async function MiDiaAdminPage({ searchParams }: { searchParams: Promise<{ fecha?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).maybeSingle()
  if (perfil?.rol !== 'admin') redirect('/inicio')
  const params = await searchParams
  const fecha = fechaDiaValida(params.fecha) ? params.fecha : fechaArgentina()
  const [cuentas, accesos, resumen] = await Promise.all([
    supabase.from('perfiles').select('id,nombre,estado').neq('rol', 'admin').not('id', 'in', FILTRO_CUENTAS_PRUEBA).or('tipo_usuario.eq.socia,rol.in.(afiliada,afiliada_lanzamiento)').order('nombre'),
    supabase.from('accesos_mi_dia').select('usuaria_id,habilitada'),
    supabase.rpc('resumen_mi_dia', { desde: fecha, hasta: fecha }),
  ])
  const socias = (cuentas.data ?? []).map(s => ({ ...s, habilitada: (accesos.data ?? []).some(a => a.usuaria_id === s.id && a.habilitada) }))
  return <MiDiaAdmin key={fecha} socias={socias} resumen={((resumen.data ?? []) as ResumenDia[]).filter(r => !esCuentaPrueba(r.alumna_id))} fecha={fecha} errorCarga={Boolean(cuentas.error || accesos.error || resumen.error)} />
}
