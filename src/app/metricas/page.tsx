import { createClient } from '@/lib/supabase/server'
import ModuleLocked from '@/components/ModuleLocked'
import { permisoMetricas } from '@/lib/metrics-server'
import { fechaArgentina, normalizarMetrica, type Metrica } from '@/lib/metrics'
import { redirect } from 'next/navigation'
import MetricasCliente from './MetricasCliente'

export default async function MetricasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const acceso=await permisoMetricas(supabase,user.id)
  if(acceso.error) return <main className="min-h-screen bg-[#F4EFEA] p-8"><p role="alert">No pudimos comprobar tu acceso. Intentá nuevamente.</p><a href="/inicio">Volver a mi espacio</a></main>
  if (!acceso.permitido) return <ModuleLocked id="metricas" />

  const { data: historial, error } = await supabase
    .from('metricas')
    .select('*')
    .eq('alumna_id', user.id)
    .order('fecha', { ascending: false })
    .order('actualizado_at', { ascending: false })
    .limit(500)

  return <MetricasCliente historial={(historial ?? []).map(m=>normalizarMetrica(m as Metrica))} fechaInicial={fechaArgentina()} errorCarga={Boolean(error)} limitado={historial?.length===500} />
}
