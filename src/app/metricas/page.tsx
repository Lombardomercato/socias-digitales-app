import { createClient } from '@/lib/supabase/server'
import ModuleLocked from '@/components/ModuleLocked'
import { esAdministradora } from '@/lib/module-guard'
import { redirect } from 'next/navigation'
import MetricasCliente from './MetricasCliente'

export default async function MetricasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!await esAdministradora(user.id)) return <ModuleLocked id="metricas" />

  const { data: historial } = await supabase
    .from('metricas')
    .select('*')
    .eq('alumna_id', user.id)
    .order('created_at', { ascending: false })

  return <MetricasCliente userId={user.id} historial={historial ?? []} />
}
