import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { normalizarMetrica, type Metrica } from '@/lib/metrics'
import MetricasAdmin from './MetricasAdmin'
import { FILTRO_CUENTAS_PRUEBA } from '@/lib/test-accounts'

export default async function MetricasAdminPage() {
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user)redirect('/login')
  const {data:perfil}=await supabase.from('perfiles').select('rol').eq('id',user.id).maybeSingle()
  if(perfil?.rol!=='admin')redirect('/inicio')
  const [registros,cuentas,accesos]=await Promise.all([
    supabase.from('metricas').select('*, perfiles(nombre)').not('alumna_id', 'in', FILTRO_CUENTAS_PRUEBA).order('fecha',{ascending:false}).order('actualizado_at',{ascending:false}).limit(1000),
    supabase.from('perfiles').select('id,nombre,estado').neq('rol','admin').not('id', 'in', FILTRO_CUENTAS_PRUEBA).or('tipo_usuario.eq.socia,rol.in.(afiliada,afiliada_lanzamiento)').order('nombre'),
    supabase.from('accesos_metricas').select('usuaria_id,habilitada'),
  ])
  const socias=(cuentas.data ?? []).map(s=>({...s,habilitada:(accesos.data ?? []).some(a=>a.usuaria_id===s.id && a.habilitada)}))
  return <MetricasAdmin metricas={(registros.data ?? []).map(m=>normalizarMetrica(m as Metrica))} socias={socias} errorCarga={Boolean(registros.error||cuentas.error||accesos.error)} limitado={registros.data?.length===1000} />
}
